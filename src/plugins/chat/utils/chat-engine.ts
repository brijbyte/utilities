/**
 * Chat engine — wraps the pi Agent for browser use.
 *
 * Creates an Agent (pure chat, no tools), subscribes to events,
 * and exposes a simple prompt(text) → void interface.
 * The React layer subscribes to state updates via callbacks.
 */

import { Agent } from "@mariozechner/pi-agent-core";
import type {
  AgentEvent,
  AgentMessage,
  AgentState,
} from "@mariozechner/pi-agent-core";
import type { Api, Model, ThinkingLevel } from "@mariozechner/pi-ai";
import type { BrowserAuthStorage } from "./browser-auth-storage";
import type { BrowserModelRegistry } from "./browser-model-registry";
import type { BrowserSessionManager } from "./browser-session";

export type ChatEventListener = (event: AgentEvent) => void;

export class ChatEngine {
  private agent: Agent;
  private sessionManager: BrowserSessionManager;
  private authStorage: BrowserAuthStorage;
  private modelRegistry: BrowserModelRegistry;
  private listeners: Set<ChatEventListener> = new Set();
  private _saveDebounce: ReturnType<typeof setTimeout> | undefined;

  constructor(
    authStorage: BrowserAuthStorage,
    modelRegistry: BrowserModelRegistry,
    sessionManager: BrowserSessionManager,
  ) {
    this.authStorage = authStorage;
    this.modelRegistry = modelRegistry;
    this.sessionManager = sessionManager;

    this.agent = new Agent({
      getApiKey: async (provider: string) => {
        return this.authStorage.getApiKey(provider);
      },
      // Ensure the model is set; the default model may not have browser CORS
      // access, but we'll set the right model before prompting.
    });

    // Subscribe to agent events
    this.agent.subscribe((event: AgentEvent) => {
      this.handleEvent(event);
    });
  }

  private handleEvent(event: AgentEvent): void {
    // Persist messages on message_end
    if (event.type === "message_end") {
      const msg = event.message as AgentMessage;
      this.sessionManager.appendMessage(msg);
      this.debouncedSave();
    }

    // Broadcast to UI listeners — use a copy to avoid mutation issues
    const listeners = [...this.listeners];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("[chat-engine] listener error:", err);
      }
    }
  }

  private debouncedSave(): void {
    clearTimeout(this._saveDebounce);
    this._saveDebounce = setTimeout(() => {
      this.sessionManager.save().catch(() => {});
    }, 1000);
  }

  /** Subscribe to agent events. Returns unsubscribe fn. */
  subscribe(listener: ChatEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get current agent state */
  get state(): AgentState {
    return this.agent.state;
  }

  /** Get current model */
  get model(): Model<Api> | undefined {
    return this.agent.state.model;
  }

  /** Whether the agent is currently streaming */
  get isStreaming(): boolean {
    return this.agent.state.isStreaming;
  }

  /** Set the model */
  async setModel(model: Model<Api>): Promise<void> {
    const apiKey = await this.modelRegistry.getApiKey(model);
    if (!apiKey) {
      throw new Error(`No API key for ${model.provider}/${model.id}`);
    }
    this.agent.setModel(model);
  }

  /** Set thinking level */
  setThinkingLevel(level: ThinkingLevel | "off"): void {
    this.agent.setThinkingLevel(level);
  }

  /** Set system prompt */
  setSystemPrompt(prompt: string): void {
    this.agent.setSystemPrompt(prompt);
  }

  /** Send a user message */
  async prompt(text: string): Promise<void> {
    if (this.agent.state.isStreaming) {
      throw new Error("Agent is already processing");
    }

    if (!this.agent.state.model) {
      throw new Error("No model selected. Please select a model first.");
    }

    // Validate API key
    const apiKey = await this.modelRegistry.getApiKey(this.agent.state.model);
    if (!apiKey) {
      throw new Error(
        `No API key for ${this.agent.state.model.provider}. Please login first.`,
      );
    }

    // Race prompt against unhandled rejections from the agent loop's
    // internal async IIFE. If the LLM call fails inside the loop's IIFE,
    // the error becomes an unhandled rejection and prompt() hangs forever.
    await new Promise<void>((resolve, reject) => {
      const onUnhandled = (e: PromiseRejectionEvent) => {
        e.preventDefault();
        cleanup();
        reject(
          e.reason instanceof Error ? e.reason : new Error(String(e.reason)),
        );
      };

      const cleanup = () => {
        window.removeEventListener("unhandledrejection", onUnhandled);
      };

      window.addEventListener("unhandledrejection", onUnhandled);

      this.agent
        .prompt(text)
        .then(() => {
          cleanup();
          resolve();
        })
        .catch((err) => {
          cleanup();
          reject(err);
        });
    });
  }

  /** Abort current operation */
  async abort(): Promise<void> {
    this.agent.abort();
    await this.agent.waitForIdle();
  }

  /** Start a new session */
  async newSession(): Promise<void> {
    // Save current session first
    await this.sessionManager.save();
    this.agent.reset();
    this.sessionManager.newSession();
  }

  /** Load an existing session */
  async loadSession(sessionId: string): Promise<boolean> {
    const ok = await this.sessionManager.load(sessionId);
    if (ok) {
      this.agent.replaceMessages(this.sessionManager.getMessages());
    }
    return ok;
  }

  /** Get all messages including streaming partial */
  getDisplayMessages(): AgentMessage[] {
    const messages = [...this.agent.state.messages];
    if (this.agent.state.streamMessage) {
      messages.push(this.agent.state.streamMessage);
    }
    return messages;
  }

  /** Get the streaming partial message if any */
  getStreamMessage(): AgentMessage | null {
    return this.agent.state.streamMessage;
  }

  /** Force save */
  async save(): Promise<void> {
    await this.sessionManager.save();
  }

  dispose(): void {
    clearTimeout(this._saveDebounce);
    this.listeners.clear();
  }
}
