import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = 'fra1';

const ASSIST_API_URL =
  process.env.ASSIST_API_URL || "http://localhost:8000/assist";

export async function POST(req: NextRequest) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {}

  const prompt: string = ((body as any)?.query?.prompt || "") as string;
  console.debug("[assist][proxy] -> POST", ASSIST_API_URL, {
    hasBody: !!body,
    queryId: (body as any)?.query?.id,
    promptLen: prompt.length,
    promptPreview: prompt.length > 160 ? prompt.slice(0, 160) + "…" : prompt,
    sessionIds: {
      processor_id: (body as any)?.session?.processor_id,
      activity_id: (body as any)?.session?.activity_id,
      request_id: (body as any)?.session?.request_id,
    },
  });

  const upstream = await fetch(ASSIST_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      connection: "keep-alive",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  console.debug(
    "[assist][proxy] <- upstream",
    upstream.status,
    upstream.statusText,
    {
      contentType: upstream.headers.get("content-type") || undefined,
    }
  );

  const respHeaders = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) respHeaders.set("content-type", ct);
  respHeaders.set("cache-control", "no-cache, no-transform");
  respHeaders.set("connection", "keep-alive");

  if (!upstream.body) {
    console.error("[assist][proxy] upstream body is null");
    return new Response("Upstream returned no body", {
      status: 502,
      headers: respHeaders,
    });
  }

  const [toClient, toLog] = upstream.body.tee();
  (async () => {
    try {
      const reader = toLog.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const finalByStream: Record<
        string,
        {
          ids: string[];
          chunks: Record<string, string>;
          type: "chunked" | "atomic" | null;
          atomic?: string;
        }
      > = {};
      const processBlock = (block: string) => {
        let eventName: string | undefined;
        const dataLines: string[] = [];
        for (const raw of block.split(/\n/)) {
          const line = raw.trimEnd();
          if (!line) continue;
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:"))
            dataLines.push(line.slice(5).trimStart());
        }
        if (!dataLines.length) return;
        const payload = dataLines.join("\n");
        if (payload === "[DONE]" || eventName === "done") {
          console.debug("[assist][proxy] stream: [DONE]");

          const streamIds = Object.keys(finalByStream);
          for (const sid of streamIds) {
            const acc = finalByStream[sid];
            let full = "";
            if (acc?.type === "atomic" && typeof acc.atomic === "string") {
              full = acc.atomic;
            } else if (acc) {
              full = acc.ids.map((id) => acc.chunks[id]).join("");
            }
            if (full) {
              console.debug(
                "[assist][proxy] FINAL_RESPONSE (assembled):",
                full
              );
            } else {
              console.debug(
                "[assist][proxy] FINAL_RESPONSE (assembled): (empty)"
              );
            }
          }
          return;
        }
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) {
            console.debug(
              "[assist][proxy] stream delta:",
              JSON.stringify(delta)
            );
            return;
          }
          const ev = json?.event_name || eventName;
          if (ev === "EventName.START") {
            const text = typeof json?.content === "string" ? json.content : "";
            console.debug("[assist][proxy] START:", text);
            return;
          }
          if (ev === "EventName.FETCH") {
            const text = typeof json?.content === "string" ? json.content : "";
            console.debug("[assist][proxy] FETCH:", text);
            return;
          }
          if (ev === "EventName.SOURCES") {
            const src = json?.content || {};
            const provider = src?.provider;
            const type = src?.type;
            let dataInfo = "";
            if (src?.data != null) {
              try {
                const s = JSON.stringify(src.data);
                dataInfo = s.length > 120 ? s.slice(0, 120) + "…" : s;
              } catch {
                dataInfo = String(src.data).slice(0, 120) + "…";
              }
            }
            console.debug("[assist][proxy] SOURCES:", { provider, type, dataPreview: dataInfo });
            return;
          }
          if (ev === "EventName.METRICS" || (typeof json?.content_type === "string" && json.content_type.startsWith("metrics"))) {
            const m = json?.content ?? json?.metrics ?? {};
            let preview = "";
            try {
              const s = JSON.stringify(m);
              preview = s.length > 160 ? s.slice(0, 160) + "…" : s;
            } catch {
              preview = String(m);
            }
            console.debug("[assist][proxy] METRICS:", preview);
            return;
          }
          if (ev === "EventName.FINAL_RESPONSE") {
            const sid = (json?.stream_id as string | undefined) || "default";
            const content = json?.content;
            const ctype = json?.content_type as string | undefined;
            const eid = json?.id as string | undefined;
            if (typeof content === "string") {
              if (ctype?.startsWith("chunked")) {
                const acc = finalByStream[sid] || {
                  ids: [],
                  chunks: {},
                  type: "chunked" as const,
                };
                if (eid && !acc.ids.includes(eid)) acc.ids.push(eid);
                if (eid) acc.chunks[eid] = content;
                finalByStream[sid] = acc;
              } else if (ctype?.startsWith("atomic")) {
                finalByStream[sid] = {
                  ids: [],
                  chunks: {},
                  type: "atomic",
                  atomic: content,
                };
              } else {
                const acc = finalByStream[sid] || {
                  ids: [],
                  chunks: {},
                  type: "chunked" as const,
                };
                const fakeId = String(acc.ids.length + 1).padStart(8, "0");
                acc.ids.push(fakeId);
                acc.chunks[fakeId] = content;
                finalByStream[sid] = acc;
              }
            }
            return;
          }
          console.debug("[assist][proxy] event:", ev || "(none)");
          } catch {
            console.debug("[assist][proxy] stream raw:", payload.slice(0, 200));
          }
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() || "";
        for (const part of parts) processBlock(part);
      }
      if (buffer) processBlock(buffer);
    } catch (e) {
      console.error("[assist][proxy] stream error:", e);
    }
  })();

  return new Response(toClient, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}

export async function GET() {
  console.debug("[assist][proxy] health check");
  return Response.json({ ok: true });
}
