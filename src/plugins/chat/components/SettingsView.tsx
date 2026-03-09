import { useState } from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "../../../components/Button";
import { useStore, useStoreState } from "../utils/context";

export function SettingsView() {
  const store = useStore();
  const state = useStoreState();
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    store.setSystemPrompt(systemPrompt);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-surface shrink-0">
        <Button variant="ghost" onClick={() => store.setView("chat")}>
          <ArrowLeft size={14} />
        </Button>
        <Settings size={14} className="text-text-muted" />
        <span className="text-xs font-medium">Settings</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-lg mx-auto space-y-6">
          {/* System Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              System Prompt
            </label>
            <p className="text-xs text-text-muted">
              Custom instructions prepended to every conversation
            </p>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g., You are a helpful assistant. Be concise and clear."
              rows={6}
              className="w-full text-xs px-3 py-2 rounded border border-border bg-bg text-text placeholder:text-text-muted outline-none focus:border-primary resize-y"
            />
            <div className="flex items-center gap-2">
              <Button variant="primary" onClick={handleSave}>
                Save
              </Button>
              {saved && <span className="text-xs text-success">✓ Saved</span>}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">
              About
            </h3>
            <div className="text-xs text-text-muted space-y-1">
              <p>
                Chat with LLMs from multiple providers, right in the browser.
              </p>
              <p>
                Credentials are stored in browser IndexedDB. Sessions are
                persisted locally.
              </p>
              <p>
                Current model:{" "}
                <span className="text-text">
                  {state.model
                    ? `${state.model.provider}/${state.model.name}`
                    : "None"}
                </span>
              </p>
              <p>
                Authenticated providers:{" "}
                <span className="text-text">
                  {state.authenticatedProviders.length > 0
                    ? state.authenticatedProviders.join(", ")
                    : "None"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
