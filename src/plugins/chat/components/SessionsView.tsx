import { ArrowLeft, Trash2, MessageSquare, Calendar } from "lucide-react";
import { Button } from "../../../components/Button";
import { useStore, useStoreState } from "../utils/context";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function SessionsView() {
  const store = useStore();
  const state = useStoreState();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-surface shrink-0">
        <Button variant="ghost" onClick={() => store.setView("chat")}>
          <ArrowLeft size={14} />
        </Button>
        <MessageSquare size={14} className="text-text-muted" />
        <span className="text-xs font-medium">Sessions</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-lg mx-auto space-y-2">
          {state.sessions.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No saved sessions yet</p>
              <p className="text-xs mt-1">
                Sessions are saved automatically after the first response
              </p>
            </div>
          ) : (
            state.sessions.map((session) => {
              const isCurrent = session.id === state.sessionId;
              return (
                <button
                  key={session.id}
                  onClick={() => {
                    if (!isCurrent) store.loadSession(session.id);
                  }}
                  className={`w-full text-left border rounded-lg p-3 transition-colors ${
                    isCurrent
                      ? "border-primary bg-accent-subtle"
                      : "border-border hover:bg-bg-hover cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text truncate">
                        {session.firstMessage}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-text-muted">
                        <span className="flex items-center gap-1 text-[10px]">
                          <Calendar size={10} />
                          {formatDate(session.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1 text-[10px]">
                          <MessageSquare size={10} />
                          {session.messageCount}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] text-primary font-medium">
                            current
                          </span>
                        )}
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          store.deleteSession(session.id);
                        }}
                        className="p-1 text-text-muted hover:text-danger rounded hover:bg-bg-hover"
                        title="Delete session"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
