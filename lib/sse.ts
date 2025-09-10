export type SSEEvent = {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
};
export type SSEEventHandler = (evt: SSEEvent) => void;

export async function streamSSE(
  response: Response,
  onEvent: SSEEventHandler,
  onDone?: () => void,
  onError?: (e: unknown) => void
) {
  try {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body to read");
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let curEvent: string | undefined = undefined;
    let curData: string[] = [];
    let curId: string | undefined = undefined;
    let stopped = false;

    const flush = () => {
      if (curEvent == null && curData.length === 0 && curId == null) return;
      const data = curData.join("\n");
      const evt = { event: curEvent, data, id: curId };
      onEvent(evt);
      if (data === "[DONE]" || curEvent === "done") {
        onDone?.();
        stopped = true;
      }
      curEvent = undefined;
      curData = [];
      curId = undefined;
    };

    const processLine = (raw: string) => {
      let line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
      if (line === "") {
        flush();
        return;
      }
      if (line.startsWith(":")) return;
      const idx = line.indexOf(":");
      const field = idx === -1 ? line : line.slice(0, idx);
      let value = idx === -1 ? "" : line.slice(idx + 1);
      if (value.startsWith(" ")) value = value.slice(1);
      switch (field) {
        case "event":
          curEvent = value;
          break;
        case "data":
          curData.push(value);
          break;
        case "id":
          if (!value.includes("\0")) curId = value;
          break;
        case "retry":
          break;
        default:
          break;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nlIdx: number;
      while ((nlIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nlIdx);
        buffer = buffer.slice(nlIdx + 1);
        processLine(line);
        if (stopped) break;
      }
      if (stopped) break;
    }

    if (!stopped) {
      if (buffer.length > 0) processLine(buffer);

      flush();
      onDone?.();
    }
  } catch (e) {
    onError?.(e);
  }
}
