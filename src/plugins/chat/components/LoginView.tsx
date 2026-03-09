import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  KeyRound,
  LogOut,
  ExternalLink,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "../../../components/Button";
import { useStore, useStoreState } from "../utils/context";
import { getOAuthProviders } from "@mariozechner/pi-ai/oauth";

// Provider display config
const API_KEY_PROVIDERS: Array<{
  id: string;
  name: string;
  envHint: string;
  docsUrl: string;
}> = [
  {
    id: "openai",
    name: "OpenAI",
    envHint: "OPENAI_API_KEY",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    envHint: "ANTHROPIC_API_KEY",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "google",
    name: "Google (Gemini)",
    envHint: "GEMINI_API_KEY",
    docsUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    envHint: "XAI_API_KEY",
    docsUrl: "https://console.x.ai/",
  },
  {
    id: "groq",
    name: "Groq",
    envHint: "GROQ_API_KEY",
    docsUrl: "https://console.groq.com/keys",
  },
  {
    id: "mistral",
    name: "Mistral",
    envHint: "MISTRAL_API_KEY",
    docsUrl: "https://console.mistral.ai/api-keys",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    envHint: "OPENROUTER_API_KEY",
    docsUrl: "https://openrouter.ai/keys",
  },
];

function ApiKeySection({
  provider,
  isAuthenticated,
}: {
  provider: (typeof API_KEY_PROVIDERS)[0];
  isAuthenticated: boolean;
}) {
  const store = useStore();
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await store.loginWithApiKey(provider.id, apiKey.trim());
      setApiKey("");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await store.logout(provider.id);
  };

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{provider.name}</span>
          {isAuthenticated && (
            <CheckCircle2 size={12} className="text-success" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <a
            href={provider.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-text-muted hover:text-text p-1"
            title="Get API key"
          >
            <ExternalLink size={12} />
          </a>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="text-text-muted hover:text-danger p-1"
              title="Logout"
            >
              <LogOut size={12} />
            </button>
          )}
        </div>
      </div>
      {!isAuthenticated && (
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder={`Paste ${provider.envHint}`}
            className="flex-1 text-xs px-2 py-1.5 rounded border border-border bg-bg text-text placeholder:text-text-muted outline-none focus:border-primary"
          />
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── OAuth login state machine ───────────────────────────────

type OAuthLoginStep =
  | { step: "idle" }
  | {
      step: "prompting";
      message: string;
      placeholder?: string;
      allowEmpty?: boolean;
    }
  | { step: "auth"; url: string; instructions?: string }
  | { step: "polling"; message: string }
  | { step: "done" }
  | { step: "error"; message: string };

function OAuthLoginFlow({
  providerId,
  onComplete,
}: {
  providerId: string;
  onComplete: (success: boolean) => void;
}) {
  const store = useStore();
  const [loginStep, setLoginStep] = useState<OAuthLoginStep>({
    step: "polling",
    message: "Connecting…",
  });
  const [promptValue, setPromptValue] = useState("");
  const promptResolverRef = useRef<((value: string) => void) | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Start/restart login on mount or retry (when `attempt` changes).
  // All setState calls happen inside async callbacks, not synchronously.
  useEffect(() => {
    let cancelled = false;
    store
      .loginOAuth(providerId, {
        onAuth: (info) => {
          if (cancelled) return;
          setLoginStep({
            step: "auth",
            url: info.url,
            instructions: info.instructions,
          });
          window.open(info.url, "_blank");
        },
        onPrompt: (prompt) => {
          if (cancelled) return new Promise<string>(() => {});
          setLoginStep({
            step: "prompting",
            message: prompt.message,
            placeholder: prompt.placeholder,
            allowEmpty: prompt.allowEmpty,
          });
          setPromptValue("");
          return new Promise<string>((resolve) => {
            promptResolverRef.current = resolve;
          });
        },
        onProgress: (message) => {
          if (cancelled) return;
          setLoginStep((s) => {
            if (s.step === "prompting") return s;
            return { step: "polling", message };
          });
        },
      })
      .then(() => {
        if (cancelled) return;
        setLoginStep({ step: "done" });
        setTimeout(() => onComplete(true), 1500);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === "Login cancelled") {
          onComplete(false);
        } else {
          setLoginStep({ step: "error", message: msg });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const handleRetry = () => {
    setLoginStep({ step: "polling", message: "Connecting…" });
    setPromptValue("");
    setAttempt((n) => n + 1);
  };

  const handlePromptSubmit = () => {
    if (!promptResolverRef.current) return;
    const step = loginStep;
    if (step.step !== "prompting") return;

    const val = promptValue.trim();
    if (!val && !step.allowEmpty) return;

    promptResolverRef.current(val);
    promptResolverRef.current = null;
    setLoginStep({ step: "polling", message: "Connecting…" });
  };

  return (
    <div className="mt-2 space-y-2 border-t border-border-muted pt-2">
      {/* Prompting step — show input */}
      {loginStep.step === "prompting" && (
        <div className="space-y-1.5">
          <p className="text-xs text-text">{loginStep.message}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePromptSubmit()}
              placeholder={loginStep.placeholder || ""}
              className="flex-1 text-xs px-2 py-1.5 rounded border border-border bg-bg text-text placeholder:text-text-muted outline-none focus:border-primary"
              autoFocus
            />
            <Button variant="primary" onClick={handlePromptSubmit}>
              {loginStep.allowEmpty && !promptValue.trim() ? "Skip" : "Submit"}
            </Button>
          </div>
          {loginStep.allowEmpty && (
            <p className="text-[10px] text-text-muted">
              Leave empty and press Submit/Skip to use the default
            </p>
          )}
        </div>
      )}

      {/* Auth step — show URL and instructions */}
      {loginStep.step === "auth" && (
        <div className="space-y-1.5">
          {loginStep.instructions && (
            <p className="text-xs font-medium text-warning">
              {loginStep.instructions}
            </p>
          )}
          <a
            href={loginStep.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline break-all block"
          >
            Open authorization page →
          </a>
          <div className="flex items-center gap-2 text-text-muted text-xs">
            <Loader2 size={12} className="animate-spin" />
            <span>Waiting for authorization…</span>
          </div>
        </div>
      )}

      {/* Polling step */}
      {loginStep.step === "polling" && (
        <div className="flex items-center gap-2 text-text-muted text-xs">
          <Loader2 size={12} className="animate-spin" />
          <span>{loginStep.message}</span>
        </div>
      )}

      {/* Done */}
      {loginStep.step === "done" && (
        <p className="text-xs text-success">✓ Logged in successfully</p>
      )}

      {/* Error */}
      {loginStep.step === "error" && (
        <div className="space-y-1">
          <p className="text-xs text-danger">{loginStep.message}</p>
          <Button variant="outline" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

function OAuthSection() {
  const store = useStore();
  const state = useStoreState();
  const oauthProviders = getOAuthProviders();

  // Track which provider is actively logging in
  const [activeLoginId, setActiveLoginId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">
        OAuth Login
      </h3>
      <p className="text-xs text-text-muted">
        Login with your subscription (no API key needed)
      </p>
      <div className="space-y-2">
        {oauthProviders.map((provider) => {
          const isAuthenticated = state.authenticatedProviders.includes(
            provider.id,
          );
          const isActive = activeLoginId === provider.id;

          return (
            <div
              key={provider.id}
              className="border border-border rounded-lg p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{provider.name}</span>
                  {isAuthenticated && (
                    <CheckCircle2 size={12} className="text-success" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {isAuthenticated ? (
                    <button
                      onClick={() => store.logout(provider.id)}
                      className="text-text-muted hover:text-danger p-1"
                      title="Logout"
                    >
                      <LogOut size={12} />
                    </button>
                  ) : !isActive ? (
                    <Button
                      variant="outline"
                      onClick={() => setActiveLoginId(provider.id)}
                      disabled={activeLoginId !== null}
                    >
                      Login
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Active login flow */}
              {isActive && !isAuthenticated && (
                <OAuthLoginFlow
                  providerId={provider.id}
                  onComplete={() => setActiveLoginId(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LoginView() {
  const store = useStore();
  const state = useStoreState();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-surface shrink-0">
        <Button variant="ghost" onClick={() => store.setView("chat")}>
          <ArrowLeft size={14} />
        </Button>
        <KeyRound size={14} className="text-text-muted" />
        <span className="text-xs font-medium">Login / API Keys</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-lg mx-auto space-y-6">
          {/* OAuth providers */}
          <OAuthSection />

          {/* API Key providers */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">
              API Key Login
            </h3>
            <p className="text-xs text-text-muted">
              Enter your API key directly
            </p>
            <div className="space-y-2">
              {API_KEY_PROVIDERS.map((provider) => (
                <ApiKeySection
                  key={provider.id}
                  provider={provider}
                  isAuthenticated={state.authenticatedProviders.includes(
                    provider.id,
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
