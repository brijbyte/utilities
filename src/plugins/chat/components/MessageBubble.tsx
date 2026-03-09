import { useMemo } from "react";
import { marked } from "marked";
import { User, Bot, Copy, Check } from "lucide-react";
import { useState } from "react";
import type {
  AssistantMessage,
  UserMessage,
  TextContent,
  ThinkingContent,
} from "@mariozechner/pi-ai";

// Configure marked for security
marked.setOptions({
  breaks: true,
  gfm: true,
});

function extractText(message: UserMessage | AssistantMessage): {
  text: string;
  thinking: string | undefined;
} {
  const content = message.content;

  if (typeof content === "string") {
    return { text: content, thinking: undefined };
  }

  const textParts: string[] = [];
  let thinking: string | undefined;

  for (const block of content) {
    if (block.type === "text") {
      textParts.push((block as TextContent).text);
    } else if (block.type === "thinking") {
      thinking = (block as ThinkingContent).thinking;
    }
  }

  return { text: textParts.join(""), thinking };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-bg-hover text-text-muted"
      title="Copy message"
    >
      {copied ? (
        <Check size={12} className="text-success" />
      ) : (
        <Copy size={12} />
      )}
    </button>
  );
}

export function MessageBubble({
  message,
}: {
  message: UserMessage | AssistantMessage;
}) {
  const isUser = message.role === "user";
  const { text, thinking } = extractText(message);

  const html = useMemo(() => {
    if (!text) return "";
    try {
      return marked.parse(text) as string;
    } catch {
      return text;
    }
  }, [text]);

  if (isUser) {
    return (
      <div className="flex gap-3 group">
        <div className="shrink-0 mt-0.5">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={13} className="text-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-text">You</span>
            <CopyButton text={text} />
          </div>
          <div className="text-sm text-text whitespace-pre-wrap break-words">
            {text}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  const assistantMsg = message as AssistantMessage;
  const hasError = assistantMsg.stopReason === "error";
  const isAborted = assistantMsg.stopReason === "aborted";
  const usage = assistantMsg.usage;

  return (
    <div className="flex gap-3 group">
      <div className="shrink-0 mt-0.5">
        <div className="w-6 h-6 rounded-full bg-accent-subtle flex items-center justify-center">
          <Bot size={13} className="text-accent" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-text">
            {assistantMsg.model || "Assistant"}
          </span>
          {usage && usage.totalTokens > 0 && (
            <span className="text-[10px] text-text-muted">
              {usage.totalTokens.toLocaleString()} tokens
              {usage.cost.total > 0 && ` · $${usage.cost.total.toFixed(4)}`}
            </span>
          )}
          <CopyButton text={text} />
        </div>

        {/* Thinking block */}
        {thinking && (
          <details className="mb-2">
            <summary className="text-xs text-text-muted cursor-pointer hover:text-text select-none">
              Thinking…
            </summary>
            <div className="mt-1 pl-3 border-l-2 border-border-muted text-xs text-text-muted whitespace-pre-wrap">
              {thinking}
            </div>
          </details>
        )}

        {/* Main content */}
        {hasError && assistantMsg.errorMessage ? (
          <div className="text-sm text-danger">{assistantMsg.errorMessage}</div>
        ) : isAborted ? (
          <div className="text-sm text-text-muted italic">
            {text || "(aborted)"}
          </div>
        ) : html ? (
          <div
            className="prose-agent text-sm"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : !assistantMsg.stopReason ? (
          /* Still streaming but no text yet */
          <div className="text-sm text-text-muted">
            <span className="inline-block w-1.5 h-4 bg-text-muted/50 animate-pulse rounded-sm" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
