import { KeyRound, Plus, History, Settings, Square, Brain } from "lucide-react";
import { Button } from "../../../components/Button";
import { GroupedSelect } from "../../../components/Select";
import { useStore, useStoreState } from "../utils/context";
import type { Api, Model } from "@mariozechner/pi-ai";

const THINKING_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function Toolbar() {
  const store = useStore();
  const state = useStoreState();

  // Group available models by provider
  const modelGroups = (() => {
    const byProvider = new Map<string, Model<Api>[]>();
    for (const m of state.availableModels) {
      const list = byProvider.get(m.provider) ?? [];
      list.push(m);
      byProvider.set(m.provider, list);
    }
    return Array.from(byProvider.entries()).map(([provider, models]) => ({
      label: provider,
      options: models.map((m) => ({
        value: `${m.provider}/${m.id}`,
        label: m.name,
      })),
    }));
  })();

  const currentModelValue = state.model
    ? `${state.model.provider}/${state.model.id}`
    : "";

  const handleModelChange = async (value: string) => {
    const [provider, ...idParts] = value.split("/");
    const modelId = idParts.join("/");
    const model = state.availableModels.find(
      (m) => m.provider === provider && m.id === modelId,
    );
    if (model) {
      await store.setModel(model);
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-bg-surface shrink-0">
      {/* Model selector */}
      {state.availableModels.length > 0 ? (
        <GroupedSelect
          value={currentModelValue}
          onValueChange={handleModelChange}
          groups={modelGroups}
          align="start"
          triggerClassName="max-w-52 truncate"
          popupMinWidth="min-w-64"
        />
      ) : (
        <span className="text-xs text-text-muted">No models available</span>
      )}

      {/* Thinking level */}
      {state.model?.reasoning && (
        <div className="flex items-center gap-1">
          <Brain size={12} className="text-text-muted" />
          <select
            value={state.thinkingLevel}
            onChange={(e) =>
              store.setThinkingLevel(
                e.target.value as "off" | "minimal" | "low" | "medium" | "high",
              )
            }
            className="text-xs bg-bg-surface border border-border rounded px-1.5 py-0.5 text-text cursor-pointer outline-none hover:bg-bg-hover"
          >
            {THINKING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1" />

      {/* Stop button (shown when streaming or waiting) */}
      {(state.isStreaming || state.isWaitingForResponse) && (
        <Button
          variant="danger"
          onClick={() => store.abort()}
          className="gap-1"
        >
          <Square size={10} />
          Stop
        </Button>
      )}

      {/* New session */}
      <Button
        variant="ghost"
        onClick={() => store.newSession()}
        title="New session"
      >
        <Plus size={14} />
      </Button>

      {/* Sessions */}
      <Button
        variant="ghost"
        onClick={() => store.setView("sessions")}
        title="Session history"
      >
        <History size={14} />
      </Button>

      {/* Auth / Login */}
      <Button
        variant="ghost"
        onClick={() => store.setView("login")}
        title="Login / API Keys"
      >
        <KeyRound size={14} />
      </Button>

      {/* Settings */}
      <Button
        variant="ghost"
        onClick={() => store.setView("settings")}
        title="Settings"
      >
        <Settings size={14} />
      </Button>
    </div>
  );
}
