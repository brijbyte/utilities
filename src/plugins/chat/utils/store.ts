/**
 * Centralized store for the chat plugin.
 *
 * Holds the auth storage, model registry, session manager, and chat engine.
 * React components subscribe via useSyncExternalStore for tear-free reads.
 */

import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { Api, Model, ThinkingLevel } from "@mariozechner/pi-ai";
import { BrowserAuthStorage } from "./browser-auth-storage";
import { BrowserModelRegistry } from "./browser-model-registry";
import { BrowserSessionManager, type SessionMeta } from "./browser-session";
import { ChatEngine } from "./chat-engine";

export type AppView = "chat" | "login" | "settings" | "sessions";

export interface StoreState {
  /** Whether the store has finished initializing */
  ready: boolean;
  /** Current view */
  view: AppView;
  /** All display messages (committed + streaming partial) */
  messages: AgentMessage[];
  /** Whether agent is streaming */
  isStreaming: boolean;
  /** True after user sends a message, before first assistant token arrives */
  isWaitingForResponse: boolean;
  /** Current model */
  model: Model<Api> | undefined;
  /** Current thinking level */
  thinkingLevel: ThinkingLevel | "off";
  /** Available models (that have auth) */
  availableModels: Model<Api>[];
  /** All known models */
  allModels: Model<Api>[];
  /** Providers that have auth */
  authenticatedProviders: string[];
  /** Error message */
  error: string | undefined;
  /** Session list (populated when sessions view is open) */
  sessions: SessionMeta[];
  /** Current session ID */
  sessionId: string;
}

type Listener = () => void;

const SAVED_MODEL_KEY = "chat-model";
const SAVED_THINKING_KEY = "chat-thinking";

export class Store {
  private _state: StoreState;
  private _listeners = new Set<Listener>();
  private _authStorage: BrowserAuthStorage;
  private _modelRegistry: BrowserModelRegistry;
  private _sessionManager: BrowserSessionManager;
  private _chatEngine: ChatEngine;

  constructor() {
    this._authStorage = new BrowserAuthStorage();
    this._sessionManager = new BrowserSessionManager();
    // Model registry needs auth loaded first, but we initialize it eagerly
    // and refresh after auth loads.
    this._modelRegistry = new BrowserModelRegistry(this._authStorage);
    this._chatEngine = new ChatEngine(
      this._authStorage,
      this._modelRegistry,
      this._sessionManager,
    );

    this._state = {
      ready: false,
      view: "chat",
      messages: [],
      isStreaming: false,
      isWaitingForResponse: false,
      model: undefined,
      thinkingLevel: "off",
      availableModels: [],
      allModels: this._modelRegistry.getAll(),
      authenticatedProviders: [],
      error: undefined,
      sessions: [],
      sessionId: this._sessionManager.getSessionId(),
    };

    // Subscribe to chat engine events for UI-relevant updates
    this._chatEngine.subscribe((event) => {
      switch (event.type) {
        case "message_start": {
          // Clear waiting flag once the assistant message starts streaming
          const msg = event.message as AgentMessage;
          if ((msg as { role: string }).role === "assistant") {
            this._state = { ...this._state, isWaitingForResponse: false };
          }
          this._updateFromEngine();
          break;
        }
        case "message_update":
        case "message_end":
        case "agent_end":
          this._updateFromEngine();
          break;
      }
    });
  }

  /** Initialize: load auth from IDB, restore model, etc. */
  async init(): Promise<void> {
    await this._authStorage.load();
    this._modelRegistry.refresh();

    // Restore saved model
    const savedModel = localStorage.getItem(SAVED_MODEL_KEY);
    if (savedModel) {
      try {
        const { provider, id } = JSON.parse(savedModel);
        const model = this._modelRegistry.find(provider, id);
        if (model) {
          const apiKey = await this._modelRegistry.getApiKey(model);
          if (apiKey) {
            await this._chatEngine.setModel(model);
          }
        }
      } catch {
        // Ignore
      }
    }

    // If no model restored, try to auto-select the first available
    if (!this._chatEngine.model) {
      const available = this._modelRegistry.getAvailable();
      if (available.length > 0) {
        try {
          await this._chatEngine.setModel(available[0]);
        } catch {
          // Ignore
        }
      }
    }

    // Restore thinking level
    const savedThinking = localStorage.getItem(
      SAVED_THINKING_KEY,
    ) as ThinkingLevel | null;
    if (savedThinking) {
      this._chatEngine.setThinkingLevel(savedThinking);
    }

    this._state = {
      ...this._state,
      ready: true,
      model: this._chatEngine.model,
      thinkingLevel: this._chatEngine.state.thinkingLevel,
      availableModels: this._modelRegistry.getAvailable(),
      allModels: this._modelRegistry.getAll(),
      authenticatedProviders: this._modelRegistry.getAvailableProviders(),
    };
    this._notify();
  }

  // ── External store protocol ───────────────────────────────

  subscribe = (listener: Listener): (() => void) => {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  };

  getSnapshot = (): StoreState => {
    return this._state;
  };

  private _notify(): void {
    for (const l of this._listeners) l();
  }

  private _updateFromEngine(): void {
    this._state = {
      ...this._state,
      messages: this._chatEngine.getDisplayMessages(),
      isStreaming: this._chatEngine.isStreaming,
      model: this._chatEngine.model,
      error: this._chatEngine.state.error,
    };
    this._notify();
  }

  // ── Actions ───────────────────────────────────────────────

  async sendMessage(text: string): Promise<void> {
    // Optimistically show the user message immediately
    const userMessage: AgentMessage = {
      role: "user",
      content: [{ type: "text" as const, text }],
      timestamp: Date.now(),
    };

    this._state = {
      ...this._state,
      error: undefined,
      isWaitingForResponse: true,
      isStreaming: true,
      messages: [...this._state.messages, userMessage],
    };
    this._notify();

    try {
      await this._chatEngine.prompt(text);
    } catch (err) {
      console.error("[store] sendMessage error:", err);
      this._state = {
        ...this._state,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      // Always force a final state sync after the prompt completes.
      this._state = {
        ...this._state,
        messages: this._chatEngine.getDisplayMessages(),
        isStreaming: this._chatEngine.isStreaming,
        isWaitingForResponse: false,
        error: this._state.error || this._chatEngine.state.error,
      };
      this._notify();
    }
  }

  async abort(): Promise<void> {
    await this._chatEngine.abort();
    this._state = {
      ...this._state,
      isWaitingForResponse: false,
    };
    this._updateFromEngine();
  }

  async setModel(model: Model<Api>): Promise<void> {
    await this._chatEngine.setModel(model);
    localStorage.setItem(
      SAVED_MODEL_KEY,
      JSON.stringify({ provider: model.provider, id: model.id }),
    );
    this._state = {
      ...this._state,
      model: this._chatEngine.model,
    };
    this._notify();
  }

  setThinkingLevel(level: ThinkingLevel | "off"): void {
    this._chatEngine.setThinkingLevel(level);
    localStorage.setItem(SAVED_THINKING_KEY, level);
    this._state = {
      ...this._state,
      thinkingLevel: level,
    };
    this._notify();
  }

  setSystemPrompt(prompt: string): void {
    this._chatEngine.setSystemPrompt(prompt);
  }

  async newSession(): Promise<void> {
    await this._chatEngine.newSession();
    this._state = {
      ...this._state,
      messages: [],
      isWaitingForResponse: false,
      isStreaming: false,
      error: undefined,
      sessionId: this._sessionManager.getSessionId(),
    };
    this._notify();
  }

  async loadSession(sessionId: string): Promise<void> {
    const ok = await this._chatEngine.loadSession(sessionId);
    if (ok) {
      this._state = {
        ...this._state,
        messages: this._chatEngine.getDisplayMessages(),
        sessionId: this._sessionManager.getSessionId(),
        view: "chat",
      };
      this._notify();
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await BrowserSessionManager.deleteSession(sessionId);
    // Refresh session list
    const sessions = await BrowserSessionManager.listSessions();
    this._state = { ...this._state, sessions };
    this._notify();
  }

  async loadSessionList(): Promise<void> {
    const sessions = await BrowserSessionManager.listSessions();
    this._state = { ...this._state, sessions };
    this._notify();
  }

  setView(view: AppView): void {
    this._state = { ...this._state, view };
    this._notify();
    if (view === "sessions") {
      this.loadSessionList();
    }
  }

  // ── Auth actions ──────────────────────────────────────────

  async loginWithApiKey(provider: string, apiKey: string): Promise<void> {
    await this._authStorage.set(provider, { type: "api_key", key: apiKey });
    this._modelRegistry.refresh();

    // Auto-select a model from this provider if none selected
    if (!this._chatEngine.model) {
      const available = this._modelRegistry.getAvailable();
      const fromProvider = available.filter((m) => m.provider === provider);
      if (fromProvider.length > 0) {
        await this._chatEngine.setModel(fromProvider[0]);
      }
    }

    this._state = {
      ...this._state,
      availableModels: this._modelRegistry.getAvailable(),
      allModels: this._modelRegistry.getAll(),
      authenticatedProviders: this._modelRegistry.getAvailableProviders(),
      model: this._chatEngine.model,
    };
    this._notify();
  }

  async loginOAuth(
    providerId: string,
    callbacks: {
      onAuth: (info: { url: string; instructions?: string }) => void;
      onPrompt: (prompt: {
        message: string;
        placeholder?: string;
        allowEmpty?: boolean;
      }) => Promise<string>;
      onProgress?: (message: string) => void;
    },
  ): Promise<void> {
    await this._authStorage.login(providerId, callbacks);
    this._modelRegistry.refresh();

    // Auto-select a model from this provider
    if (!this._chatEngine.model) {
      const available = this._modelRegistry.getAvailable();
      const fromProvider = available.filter((m) => m.provider === providerId);
      if (fromProvider.length > 0) {
        await this._chatEngine.setModel(fromProvider[0]);
      }
    }

    this._state = {
      ...this._state,
      availableModels: this._modelRegistry.getAvailable(),
      allModels: this._modelRegistry.getAll(),
      authenticatedProviders: this._modelRegistry.getAvailableProviders(),
      model: this._chatEngine.model,
    };
    this._notify();
  }

  async logout(provider: string): Promise<void> {
    await this._authStorage.logout(provider);
    this._modelRegistry.refresh();

    this._state = {
      ...this._state,
      availableModels: this._modelRegistry.getAvailable(),
      allModels: this._modelRegistry.getAll(),
      authenticatedProviders: this._modelRegistry.getAvailableProviders(),
    };
    this._notify();
  }

  get authStorage(): BrowserAuthStorage {
    return this._authStorage;
  }

  get modelRegistry(): BrowserModelRegistry {
    return this._modelRegistry;
  }

  dispose(): void {
    this._chatEngine.dispose();
  }
}
