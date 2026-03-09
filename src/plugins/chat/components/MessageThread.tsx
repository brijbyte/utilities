import { useEffect, useRef } from "react";
import { useStoreState } from "../utils/context";
import { MessageBubble } from "./MessageBubble";
import { Bot, Loader2 } from "lucide-react";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { Message } from "@mariozechner/pi-ai";

function isDisplayMessage(
  msg: AgentMessage,
): msg is Message & { role: "user" | "assistant" } {
  const m = msg as Message;
  return m.role === "user" || m.role === "assistant";
}

export function MessageThread() {
  const state = useStoreState();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll whenever messages change, streaming updates, or errors appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [
    state.messages,
    state.isStreaming,
    state.isWaitingForResponse,
    state.error,
  ]);

  const displayMessages = state.messages.filter(isDisplayMessage);

  if (
    displayMessages.length === 0 &&
    !state.isStreaming &&
    !state.isWaitingForResponse
  ) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-text-muted">
        <Bot size={48} strokeWidth={1.5} className="opacity-40" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-text">Chat</p>
          <p className="text-xs">
            {state.model
              ? `Using ${state.model.name}`
              : "Select a model or login to get started"}
          </p>
          {!state.model && state.authenticatedProviders.length === 0 && (
            <p className="text-xs text-warning mt-2">
              No API keys configured — click the key icon above to login
            </p>
          )}
        </div>
        {state.error && (
          <div className="mt-4 max-w-md px-3 py-2 text-xs text-danger bg-danger/10 rounded border border-danger/20">
            {state.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {displayMessages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Waiting-for-response indicator: shown after user sends, before first assistant token */}
        {state.isWaitingForResponse && (
          <div className="flex gap-3">
            <div className="shrink-0 mt-0.5">
              <div className="w-6 h-6 rounded-full bg-accent-subtle flex items-center justify-center">
                <Bot size={13} className="text-accent" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-text-muted text-sm py-1">
              <Loader2 size={14} className="animate-spin" />
              <span>Thinking…</span>
            </div>
          </div>
        )}

        {state.error && (
          <div className="px-3 py-2 text-xs text-danger bg-danger/10 rounded border border-danger/20">
            {state.error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
