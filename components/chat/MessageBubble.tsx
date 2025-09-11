import { motion } from "framer-motion";
import type { ChatMessage } from "../../lib/types";
import { Markdown } from "../ui/Markdown";
import { useMemo, useState } from "react";

function SourcesHeader({ src }: { src: any }) {
  const [open, setOpen] = useState(false);
  const provider = src?.provider || src?.source || "source";
  const type = src?.type ? String(src.type) : "";
  let preview = "";
  try {
    const s = JSON.stringify(src?.data ?? src);
    preview = s.length > 400 ? s.slice(0, 400) + "…" : s;
  } catch {
    preview = String(src?.data ?? "");
  }
  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="text-white/80">
          {"Sources: "}
          {provider}
          {type ? " (" + type + ")" : ""}
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-white/60 hover:text-white/90"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open ? (
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap px-3 pb-3 text-white/70">
          {preview}
        </pre>
      ) : null}
    </div>
  );
}

export function MessageBubble({
  message,
  status,
  canEdit,
  isEditing,
  editText,
  onEdit,
  onChangeEdit,
  onSubmitEdit,
  onCancelEdit,
  sources,
  metrics,
}: {
  message: ChatMessage;
  status?: string;
  canEdit?: boolean;
  isEditing?: boolean;
  editText?: string;
  onEdit?: () => void;
  onChangeEdit?: (t: string) => void;
  onSubmitEdit?: () => void;
  onCancelEdit?: () => void;
  sources?: any;
  metrics?: any;
}) {
  const isUser = message.role === "user";
  const { badge, body } = useMemo(() => {
    if (isUser)
      return {
        badge: null as null | { label: string; tone: "pos" | "neg" | "neu" },
        body: message.content,
      };
    const src = message.content || "";
    const htmlMatch =
      /<p[^>]*>\s*Overall\s*Sentiment\s*:\s*([^<]+?)\s*<\/p>/i.exec(src);
    const textMatch =
      /(^|\n)\s*Overall\s*Sentiment\s*:\s*([^\n<]+)\s*(?:\n|$)/i.exec(src);
    let rest = src;
    let label: string | null = null;
    if (htmlMatch) {
      label = htmlMatch[1].trim();
      rest = src.replace(htmlMatch[0], "").replace(/^\s+/, "");
    } else if (textMatch) {
      label = textMatch[2].trim();
      rest = src.replace(textMatch[0], textMatch[1] || "");
    }
    let tone: "pos" | "neg" | "neu" = "neu";
    const low = (label || "").toLowerCase();
    if (/(bull|positiv|green|up|gain|good)/.test(low)) tone = "pos";
    else if (/(bear|negativ|red|down|loss|bad)/.test(low)) tone = "neg";
    const badge = label ? { label, tone } : null;
    return { badge, body: rest };
  }, [isUser, message.content]);

  const [copied, setCopied] = useState(false);
  const copyText = isUser ? message.content : body;
  const onCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText)
        await navigator.clipboard.writeText(copyText);
      else {
        const ta = document.createElement("textarea");
        ta.value = copyText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  const editing = isUser && isEditing;

  const widthClasses = editing
    ? "w-full sm:w-full max-w-full"
    : "w-full sm:w-auto sm:max-w-[680px]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`group max-w-full overflow-x-hidden break-words text-sm leading-relaxed ${widthClasses} ${
        isUser ? "self-end items-end" : "self-start items-start"
      } flex flex-col`}
    >
      <div
        className={`rounded-lg px-3 py-2 w-full ${
          isUser ? "bg-white/10" : "bg-white/5"
        }`}
      >
        {isUser ? (
          isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editText ?? ""}
                onChange={(e) => onChangeEdit?.(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    (e as any).isComposing ||
                    (e.nativeEvent as any)?.isComposing
                  )
                    return;
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmitEdit?.();
                  }
                }}
                rows={Math.min(
                  8,
                  Math.max(3, (editText || "").split("\n").length)
                )}
                className="w-full resize-y rounded-md bg-white/10 p-2 text-sm text-white/90 outline-none placeholder:text-white/40"
                placeholder="Edit your message…"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onCancelEdit}
                  className="rounded-md bg-white/5 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmitEdit}
                  className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/20"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-white/90">
              {message.content}
            </div>
          )
        ) : (
          <div className="text-white/90 space-y-2">
            {status ? (
              <div className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs text-white/70">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white/70" />
                <span>{status}</span>
              </div>
            ) : null}
            {metrics ? (
              <div className="flex flex-wrap gap-1 text-[11px]">
                {(() => {
                  const m: any = metrics;
                  const chips: JSX.Element[] = [];
                  const latency = m?.latency_ms ?? m?.elapsed_ms;
                  if (typeof latency === "number")
                    chips.push(
                      <span
                        key="lat"
                        className="rounded bg-white/10 px-2 py-0.5 text-white/70"
                      >
                        {Math.round(latency)} ms
                      </span>
                    );
                  const toks =
                    m?.total_tokens ??
                    m?.tokens ??
                    ((m?.input_tokens || 0) + (m?.output_tokens || 0) ||
                      undefined);
                  if (typeof toks === "number")
                    chips.push(
                      <span
                        key="tok"
                        className="rounded bg-white/10 px-2 py-0.5 text-white/70"
                      >
                        {toks} tok
                      </span>
                    );
                  if (m?.provider)
                    chips.push(
                      <span
                        key="prov"
                        className="rounded bg-white/10 px-2 py-0.5 text-white/70"
                      >
                        {String(m.provider)}
                      </span>
                    );
                  return chips;
                })()}
              </div>
            ) : null}
            {sources ? (
              <div className="rounded-md border border-white/10 bg-white/5 text-xs">
                <SourcesHeader src={sources} />
              </div>
            ) : null}
            {badge ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  badge.tone === "pos"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : badge.tone === "neg"
                    ? "bg-rose-500/15 text-rose-300"
                    : "bg-white/10 text-white/70"
                }`}
              >
                Overall Sentiment: {badge.label}
              </span>
            ) : null}
            <Markdown>{body}</Markdown>
          </div>
        )}
      </div>

      {!editing && (
        <div
          className={`mt-1 flex gap-1 transition-opacity opacity-0 group-hover:opacity-100 ${
            isUser ? "justify-end" : "justify-start"
          }`}
        >
          {isUser && canEdit && !isEditing ? (
            <button
              onClick={onEdit}
              aria-label="Edit message"
              title="Edit"
              className="rounded p-1 text-white/60 hover:text-white/90 hover:bg-white/10 focus:outline-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M15.232 5.232a2.5 2.5 0 1 1 3.536 3.536L8.5 19.036l-4 1 1-4 9.732-10.804z" />
              </svg>
            </button>
          ) : null}
          <button
            onClick={onCopy}
            aria-label="Copy message"
            title={copied ? "Copied" : "Copy"}
            className="rounded p-1 text-white/60 hover:text-white/90 hover:bg-white/10 focus-outline-none"
          >
            {copied ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M9 12.75 10.5 14.25 15 9.75 16.5 11.25 10.5 17.25 7.5 14.25 9 12.75z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M16 3.75H9A2.25 2.25 0 0 0 6.75 6v9A2.25 2.25 0 0 0 9 17.25h7A2.25 2.25 0 0 0 18.25 15V6A2.25 2.25 0 0 0 16 3.75z" />
                <path d="M6 8.25H5A2.25 2.25 0 0 0 2.75 10.5v7A2.25 2.25 0 0 0 5 19.75h7A2.25 2.25 0 0 0 14.25 17.5V16.5H9A3.75 3.75 0 0 1 5.25 12.75V8.25z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}
