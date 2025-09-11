"use client";

let GLOBAL_STREAM_ACTIVE = false;
let GLOBAL_BOOTSTRAP_DONE = false;

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import type {
  ChatMessage,
  SentientRequest,
  SentientSession,
} from "../../lib/types";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { streamSSE } from "../../lib/sse";
import { ulid } from "../../lib/ulid";

export function ChatWindow({
  onBootChange,
}: {
  onBootChange?: (booting: boolean) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);
  const [bootText, setBootText] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollNextRef = useRef(false);
  const autoFollowRef = useRef(true);
  const userPausedFollowRef = useRef(false);
  const lastScrollDistRef = useRef(0);
  const [session] = useState<SentientSession>(() => ({
    processor_id: "sentient-chat-client",
    activity_id: ulid(),
    request_id: ulid(),
    interactions: [],
  }));
  const abortRef = useRef<AbortController | null>(null);
  const initRef = useRef(false);
  const streamingRef = useRef(false);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const streamStateRef = useRef<{
    streamId: string | null;
    ids: string[];
    chunks: Record<string, string>;
  }>({
    streamId: null,
    ids: [],
    chunks: {},
  });
  const [editableUserIdx, setEditableUserIdx] = useState<number | null>(null);
  const [activeEditIdx, setActiveEditIdx] = useState<number | null>(null);
  const [activeEditText, setActiveEditText] = useState<string>("");

  const invoke = useCallback(
    async (
      prompt: string,
      renderUserMessage: boolean,
      opts?: { bootstrap?: boolean }
    ) => {
      if (GLOBAL_STREAM_ACTIVE || streamingRef.current) {
        console.debug("[chat] invoke ignored: stream already active");
        return;
      }
      GLOBAL_STREAM_ACTIVE = true;
      streamingRef.current = true;
      console.debug("[chat] invoke start", { prompt, renderUserMessage });
      setLoading(true);
      setEditableUserIdx(null);

      if (renderUserMessage) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: prompt } as ChatMessage,
        ]);
      }

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const body: SentientRequest = {
        query: { id: ulid(), prompt },
        session,
      };

      try {
        const resp = await fetch("/api/assist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        if (!resp.ok || !resp.body) {
          throw new Error(`Assist API error: ${resp.status}`);
        }

        processedIdsRef.current = new Set();
        streamStateRef.current = { streamId: null, ids: [], chunks: {} };
        console.debug(
          "[chat] stream begin: placeholder assistant created next"
        );

        setMessages((prev) => {
          const next = [
            ...prev,
            { role: "assistant", content: "" } as ChatMessage,
          ];
          console.debug("[chat] placeholder added. messages=", next.length);
          return next;
        });
        scrollNextRef.current = true;
        autoFollowRef.current = true;
        userPausedFollowRef.current = false;

        const finalize = (reason?: string) => {
          console.debug("[chat] finalize", { reason });
          userPausedFollowRef.current = false;
          GLOBAL_STREAM_ACTIVE = false;
          streamingRef.current = false;
          setLoading(false);
          setStatus(null);
          if (opts?.bootstrap) {
            setSplashProgress(100);
            setTimeout(() => setBooting(false), 250);
          }
        };

        await streamSSE(
          resp,
          ({ event, data }) => {
            try {
              const json: any = JSON.parse(data);
              const eid = json?.id as string | undefined;
              const sid = (json?.stream_id as string | undefined) || "default";
              if (eid) {
                if (processedIdsRef.current.has(eid)) {
                  console.debug("[chat] skip duplicate id", eid);
                  return;
                }
                processedIdsRef.current.add(eid);
              }

              const delta = json?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                setMessages((prev) => {
                  const copy: ChatMessage[] = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === "assistant") {
                    const nextContent = (last.content || "") + delta;
                    copy[copy.length - 1] = {
                      ...(last as ChatMessage),
                      content: nextContent,
                    };
                  }
                  return copy;
                });
                return;
              }

              const eventName: string | undefined = json?.event_name || event;
              const contentType: string | undefined = json?.content_type;
              const content: any = json?.content;
              if (
                event === "done" ||
                eventName === "done" ||
                json?.content_type === "atomic.done"
              ) {
                finalize();
                return;
              }

              if (eventName === "EventName.START") {
                if (typeof content === "string" && content) {
                  setStatus(content);
                  if (opts?.bootstrap) setBootText(content);
                }
                if (opts?.bootstrap) setSplashProgress((p) => Math.max(p, 10));
                return;
              }
              if (eventName === "EventName.FETCH") {
                if (typeof content === "string" && content)
                  setStatus(`Fetching: ${content}`);
                if (opts?.bootstrap) setSplashProgress((p) => Math.max(p, 35));
                return;
              }
              if (eventName === "EventName.SOURCES") {
                if (content && typeof content === "object") {
                  const prov = content.provider || content.source || "sources";
                  const typ = content.type ? ` ${content.type}` : "";
                  setStatus(`Sources: ${prov}${typ}`);
                } else {
                  setStatus("Gathering sources…");
                }
                if (opts?.bootstrap) setSplashProgress((p) => Math.max(p, 60));
                return;
              }

              if (eventName === "EventName.FINAL_RESPONSE") {
                if (
                  typeof content === "string" &&
                  contentType?.startsWith("chunked")
                ) {
                  if (!status || /Synthesizing|Analyzing/i.test(status))
                    setStatus("Streaming final response…");
                  if (opts?.bootstrap)
                    setSplashProgress((p) => (p < 85 ? 85 : p));
                  const ss = streamStateRef.current;
                  if (ss.streamId !== sid) {
                    console.debug("[chat] switch stream_id", {
                      from: ss.streamId,
                      to: sid,
                    });
                    ss.streamId = sid;
                    ss.ids = [];
                    ss.chunks = {};
                  }
                  if (eid && ss.ids.includes(eid)) {
                    console.debug(
                      "[chat] skip duplicate by local stream state",
                      eid
                    );
                    return;
                  }
                  if (eid) ss.ids.push(eid);
                  if (eid) ss.chunks[eid] = content;

                  const full = ss.ids.map((id) => ss.chunks[id]).join("");
                  setMessages((prev) => {
                    const copy: ChatMessage[] = [...prev];
                    const last = copy[copy.length - 1];
                    const before =
                      (last && last.role === "assistant" ? last.content : "") ||
                      "";
                    if (last && last.role === "assistant") {
                      copy[copy.length - 1] = {
                        ...(last as ChatMessage),
                        content: full,
                      };
                    }
                    console.debug("[chat] set content from stream state", {
                      id: eid,
                      sid,
                      lenBefore: before.length,
                      lenAfter: full.length,
                      messages: copy.length,
                    });
                    return copy;
                  });
                  if (json?.is_complete === true) {
                    finalize("is_complete");
                  }
                  return;
                }

                if (
                  typeof content === "string" &&
                  contentType?.startsWith("atomic")
                ) {
                  setMessages((prev) => {
                    const copy: ChatMessage[] = [...prev];
                    const last = copy[copy.length - 1];
                    if (last && last.role === "assistant") {
                      copy[copy.length - 1] = {
                        ...(last as ChatMessage),
                        content,
                      };
                    }
                    return copy;
                  });
                  finalize("atomic");
                  return;
                }
              }

              if (typeof json?.text === "string") {
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === "assistant")
                    last.content += json.text;
                  return copy;
                });
              }
            } catch {}
          },
          () => finalize("onDone"),
          (e) => finalize("onError")
        );
      } catch (e) {
        streamingRef.current = false;
        setLoading(false);
        setStatus(null);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, an error occurred while processing.",
          } as ChatMessage,
        ]);
        console.error("[chat] invoke error", e);
      }
    },
    []
  );

  const send = useCallback(
    async (text: string) => {
      await invoke(text, true);
    },
    [invoke]
  );

  const cancel = useCallback(() => {
    try {
      let lastUser = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i]?.role === "user") { lastUser = i; break; }
      }
      if (lastUser >= 0) setEditableUserIdx(lastUser);
      abortRef.current?.abort();
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const bootstrap = async () => {
      try {
        if (!GLOBAL_BOOTSTRAP_DONE) {
          GLOBAL_BOOTSTRAP_DONE = true;
          await invoke("", false, { bootstrap: true });
        }
      } catch {}
    };
    bootstrap();
  }, [invoke]);

  useEffect(() => {
    if (!booting) return;
    setSplashProgress(0);
    let p = 0;
    const id = setInterval(() => {
      p = Math.min(90, p + (5 + Math.random() * 10));
      setSplashProgress(p);
    }, 300);
    return () => clearInterval(id);
  }, [booting]);

  useEffect(() => {
    onBootChange?.(booting);
  }, [booting, onBootChange]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (userPausedFollowRef.current) {
        if (streamingRef.current && dist <= 2) {
          userPausedFollowRef.current = false;
          autoFollowRef.current = true;
        }
      } else {
        autoFollowRef.current = dist <= 48;
      }
      const prev = lastScrollDistRef.current;
      if (Math.abs(dist - prev) > 16) {
        lastScrollDistRef.current = dist;
        if (
          streamingRef.current &&
          autoFollowRef.current &&
          !userPausedFollowRef.current &&
          prev <= 8 &&
          dist > 80
        ) {
          userPausedFollowRef.current = true;
          autoFollowRef.current = false;
        }
      }
    };
    const cancelFollow = () => {
      if (streamingRef.current) {
        userPausedFollowRef.current = true;
        autoFollowRef.current = false;
      }
    };
    el.addEventListener("scroll", onScroll);
    el.addEventListener("wheel", cancelFollow, { passive: true } as any);
    el.addEventListener("touchstart", cancelFollow, { passive: true } as any);
    el.addEventListener("mousedown", cancelFollow);
    onScroll();
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", cancelFollow as any);
      el.removeEventListener("touchstart", cancelFollow as any);
      el.removeEventListener("mousedown", cancelFollow);
    };
  }, []);

  useEffect(() => {
    const cancel = () => {
      if (streamingRef.current) {
        userPausedFollowRef.current = true;
        autoFollowRef.current = false;
      }
    };
    const onWheel = () => cancel();
    const onTouchMove = () => cancel();
    const onKeyDown = (e: KeyboardEvent) => {
      const keys = [
        "PageUp",
        "PageDown",
        "Home",
        "End",
        "ArrowUp",
        "ArrowDown",
        " ",
      ];
      if (keys.includes(e.key)) cancel();
    };
    window.addEventListener("wheel", onWheel, { passive: true } as any);
    window.addEventListener("touchmove", onTouchMove, { passive: true } as any);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel as any);
      window.removeEventListener("touchmove", onTouchMove as any);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (scrollNextRef.current && bottomRef.current) {
      scrollNextRef.current = false;
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  useEffect(() => {
    if (streamingRef.current && autoFollowRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [messages]);

  if (booting) {
    return (
      <div className="flex h-[calc(100vh-10rem)] flex-col items-center justify-center p-6">
        <div className="mb-4 flex flex-col items-center">
          <motion.div layoutId="brand-logo" className="relative">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-white/5 ring-2 ring-white/20 shadow-inner">
              <div className="absolute inset-0 animate-ping rounded-full bg-sky-400/20" />
              <Image
                src="/img/sentient_logo.jpg"
                alt="Sentient"
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
          </motion.div>
          <div className="mt-3 text-sm font-medium text-white/80">
            Sentient Narrative Agent
          </div>
        </div>
        <div className="mb-2 text-white/80">
          {bootText || "Preparing agent…"}
        </div>
        {status && status !== bootText ? (
          <div className="mb-3 text-xs text-white/60">{status}</div>
        ) : null}
        <div className="w-80 max-w-full">
          <div className="h-2 w-full overflow-hidden rounded bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-300"
              style={{ width: `${splashProgress}%` }}
            />
          </div>
          <div className="mt-2 text-right text-xs text-white/60">
            {Math.round(splashProgress)}%
          </div>
        </div>
      </div>
    );
  }

  const lastAssistantIndex = (() => {
    let idx = -1;
    for (let i = 0; i < messages.length; i++)
      if (messages[i]?.role === "assistant") idx = i;
    return idx;
  })();

  const hasUserMessage = messages.some((m) => m.role === 'user')
  const showTemplates = !booting && !loading && !hasUserMessage
  const templates: string[] = [
    'Give me today trending cryptocurrency!',
    'What do you think about $BTC ?',
    'Analys $BTC ?',
    'Any good news about $BTC ?',
    'Give me sentiment analysis about $BTC?',
    'What coin are trending now ?',
  ]

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      <div ref={listRef} className="mb-3 flex-1 space-y-2 overflow-y-auto p-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex w-full ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <MessageBubble
              message={m}
              status={
                loading && i === lastAssistantIndex
                  ? status ?? undefined
                  : undefined
              }
              canEdit={i === editableUserIdx && m.role === 'user' && !loading}
              isEditing={i === activeEditIdx && m.role === 'user'}
              editText={i === activeEditIdx ? activeEditText : undefined}
              onEdit={() => {
                if (i === editableUserIdx && m.role === 'user') {
                  setActiveEditIdx(i);
                  setActiveEditText(m.content);
                }
              }}
              onChangeEdit={(t) => {
                if (i === activeEditIdx) setActiveEditText(t);
              }}
              onSubmitEdit={() => {
                if (i === activeEditIdx) {
                  setActiveEditIdx(null);
                  setEditableUserIdx(null);
                  send(activeEditText);
                }
              }}
              onCancelEdit={() => {
                if (i === activeEditIdx) setActiveEditIdx(null);
              }}
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {showTemplates && (
        <div className="mb-2 px-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]" style={{ WebkitOverflowScrolling: 'touch' }}>
            {templates.map((t, idx) => (
              <button
                key={idx}
                onClick={() => send(t)}
                className="min-w-[220px] shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10 focus:outline-none"
                title={t}
              >
                <span className="block w-[220px] truncate">{t}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <ChatInput onSend={send} onCancel={cancel} loading={loading} />
    </div>
  );
}
