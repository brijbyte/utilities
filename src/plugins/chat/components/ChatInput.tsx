import { useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { useStore, useStoreState } from "../utils/context";

export function ChatInput() {
  const store = useStore();
  const state = useStoreState();
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = state.isStreaming || state.isWaitingForResponse;
  const canSend = text.trim().length > 0 && !isBusy && !!state.model;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    setText("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    // Fire and forget — store.sendMessage handles its own errors
    // and updates state. Don't await to avoid blocking the UI.
    store.sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  };

  return (
    <div className="border-t border-border bg-bg-surface p-3 shrink-0">
      <div className="max-w-3xl mx-auto flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            state.model
              ? "Type a message… (Enter to send, Shift+Enter for newline)"
              : "Select a model to start chatting"
          }
          disabled={!state.model}
          rows={1}
          className="flex-1 resize-none rounded border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ maxHeight: 200 }}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="shrink-0 p-2 rounded bg-primary text-primary-text hover:bg-primary-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Send message"
        >
          <SendHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
