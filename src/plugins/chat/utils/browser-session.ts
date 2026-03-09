/**
 * Browser-based session manager using IndexedDB.
 *
 * Simplified version of the CLI SessionManager — stores messages as a
 * JSON array in IndexedDB keyed by session ID. No tree structure, no
 * branching — just a linear conversation for the web UI.
 */

import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { Message } from "@mariozechner/pi-ai";
export type { SessionMeta } from "./idb";
import {
  type SessionMeta,
  getAllSessionMetas,
  getSessionEntries,
  setSessionEntries,
  setSessionMeta,
  deleteSession as idbDeleteSession,
} from "./idb";

export interface BrowserSession {
  id: string;
  messages: AgentMessage[];
  createdAt: number;
  updatedAt: number;
}

function generateId(): string {
  return crypto.randomUUID();
}

function extractFirstUserText(messages: AgentMessage[]): string {
  for (const msg of messages) {
    if ((msg as Message).role === "user") {
      const content = (msg as Message).content;
      if (typeof content === "string") return content.slice(0, 200);
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "text") return block.text.slice(0, 200);
        }
      }
    }
  }
  return "(no messages)";
}

export class BrowserSessionManager {
  private sessionId: string;
  private messages: AgentMessage[] = [];
  private createdAt: number;
  private updatedAt: number;
  private _dirty = false;

  constructor() {
    this.sessionId = generateId();
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getMessages(): AgentMessage[] {
    return this.messages;
  }

  appendMessage(message: AgentMessage): void {
    this.messages = [...this.messages, message];
    this.updatedAt = Date.now();
    this._dirty = true;
  }

  /** Replace all messages (used when loading a session) */
  replaceMessages(messages: AgentMessage[]): void {
    this.messages = messages;
    this.updatedAt = Date.now();
  }

  /** Start a new session */
  newSession(): void {
    this.sessionId = generateId();
    this.messages = [];
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this._dirty = false;
  }

  /** Persist current session to IndexedDB */
  async save(): Promise<void> {
    if (this.messages.length === 0) return;

    const data = JSON.stringify(this.messages);
    await setSessionEntries(this.sessionId, data);

    const meta: SessionMeta = {
      id: this.sessionId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      messageCount: this.messages.length,
      firstMessage: extractFirstUserText(this.messages),
    };
    await setSessionMeta(meta);
    this._dirty = false;
  }

  /** Load a session from IndexedDB */
  async load(sessionId: string): Promise<boolean> {
    const raw = await getSessionEntries(sessionId);
    if (!raw) return false;

    try {
      const messages = JSON.parse(raw) as AgentMessage[];
      this.sessionId = sessionId;
      this.messages = messages;
      this._dirty = false;

      // Restore timestamps from meta
      const metas = await getAllSessionMetas();
      const meta = metas.find((m) => m.id === sessionId);
      if (meta) {
        this.createdAt = meta.createdAt;
        this.updatedAt = meta.updatedAt;
      }
      return true;
    } catch {
      return false;
    }
  }

  /** List all saved sessions */
  static async listSessions(): Promise<SessionMeta[]> {
    const metas = await getAllSessionMetas();
    return metas.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** Delete a session from IndexedDB */
  static async deleteSession(sessionId: string): Promise<void> {
    await idbDeleteSession(sessionId);
  }

  get isDirty(): boolean {
    return this._dirty;
  }
}
