"use client";

import { forwardRef, useImperativeHandle, useState } from "react";

export type ChatInputHandle = {
  setText: (t: string) => void;
  focus: () => void;
};

export const ChatInput = forwardRef<ChatInputHandle, {
  onSend: (text: string) => void;
  onCancel: () => void;
  loading: boolean;
}>(function ChatInput({ onSend, onCancel, loading }, ref) {
  const [text, setText] = useState("");

  useImperativeHandle(ref, () => ({
    setText: (t: string) => setText(t),
    focus: () => {
      const el = document.getElementById("chat-input-textarea") as HTMLTextAreaElement | null;
      el?.focus();
    },
  }), []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t) return;
        setText("");
        onSend(t);
      }}
      className="flex items-end gap-2 border-t border-white/10 pt-3"
    >
      <textarea
        id="chat-input-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e as any).isComposing || (e.nativeEvent as any)?.isComposing)
            return;
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const t = text.trim();
            if (!t || loading) return;
            setText("");
            onSend(t);
          }
        }}
        placeholder="Type a message…"
        rows={5}
        className="min-h-[40px] max-h-40 w-full resize-y rounded-md bg-white/5 p-2 text-sm text-white/90 outline-none placeholder:text-white/40"
      />
      {loading ? (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-md bg-rose-500/20 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/30"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M6 5.25A2.25 2.25 0 0 1 8.25 3h7.5A2.25 2.25 0 0 1 18 5.25v13.5A2.25 2.25 0 0 1 15.75 21h-7.5A2.25 2.25 0 0 1 6 18.75V5.25z" />
          </svg>
          Stop
        </button>
      ) : (
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/20"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M3.4 2.94a1 1 0 0 0-1.4.92v16.28a1 1 0 0 0 1.4.92l17.2-8.14a1 1 0 0 0 0-1.8L3.4 2.94z" />
          </svg>
          Send
        </button>
      )}
    </form>
  );
});
