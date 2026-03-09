/**
 * Browser-based AuthStorage using IndexedDB.
 *
 * Browser-based AuthStorage that stores
 * credentials in IndexedDB instead of the filesystem.
 * No file locking needed — single-tab model, using in-memory + IDB persistence.
 */

import type {
  OAuthCredentials,
  OAuthLoginCallbacks,
  OAuthProviderId,
} from "@mariozechner/pi-ai";
import {
  getOAuthApiKey,
  getOAuthProvider,
  getOAuthProviders,
} from "@mariozechner/pi-ai/oauth";
import { getAuthData, setAuthData } from "./idb";

export type ApiKeyCredential = {
  type: "api_key";
  key: string;
};

export type OAuthCredential = {
  type: "oauth";
} & OAuthCredentials;

export type AuthCredential = ApiKeyCredential | OAuthCredential;

export type AuthStorageData = Record<string, AuthCredential>;

/**
 * Browser-based credential storage backed by IndexedDB.
 */
export class BrowserAuthStorage {
  private data: AuthStorageData = {};

  /**
   * Load credentials from IndexedDB. Must be called once before use.
   */
  async load(): Promise<void> {
    try {
      const raw = await getAuthData();
      if (raw) {
        this.data = JSON.parse(raw) as AuthStorageData;
      }
    } catch {
      this.data = {};
    }
  }

  private async persist(): Promise<void> {
    try {
      await setAuthData(JSON.stringify(this.data, null, 2));
    } catch {
      // Silently fail — user will see auth issues on next action
    }
  }

  /** Get credential for a provider */
  get(provider: string): AuthCredential | undefined {
    return this.data[provider];
  }

  /** Set credential for a provider */
  async set(provider: string, credential: AuthCredential): Promise<void> {
    this.data[provider] = credential;
    await this.persist();
  }

  /** Remove credential for a provider */
  async remove(provider: string): Promise<void> {
    delete this.data[provider];
    await this.persist();
  }

  /** List all providers with credentials */
  list(): string[] {
    return Object.keys(this.data);
  }

  /** Check if credentials exist for a provider */
  has(provider: string): boolean {
    return provider in this.data;
  }

  /** Get all credentials */
  getAll(): AuthStorageData {
    return { ...this.data };
  }

  /**
   * Login to an OAuth provider.
   */
  async login(
    providerId: OAuthProviderId,
    callbacks: OAuthLoginCallbacks,
  ): Promise<void> {
    const provider = getOAuthProvider(providerId);
    if (!provider) {
      throw new Error(`Unknown OAuth provider: ${providerId}`);
    }

    const credentials = await provider.login(callbacks);
    await this.set(providerId, { type: "oauth", ...credentials });
  }

  /**
   * Logout from a provider.
   */
  async logout(provider: string): Promise<void> {
    await this.remove(provider);
  }

  /**
   * Get API key for a provider.
   * Priority:
   * 1. API key from storage
   * 2. OAuth token from storage (auto-refreshed)
   */
  async getApiKey(providerId: string): Promise<string | undefined> {
    const cred = this.data[providerId];

    if (cred?.type === "api_key") {
      return cred.key;
    }

    if (cred?.type === "oauth") {
      const provider = getOAuthProvider(providerId);
      if (!provider) return undefined;

      const needsRefresh = Date.now() >= cred.expires;

      if (needsRefresh) {
        try {
          const oauthCreds: Record<string, OAuthCredentials> = {};
          for (const [key, value] of Object.entries(this.data)) {
            if (value.type === "oauth") {
              oauthCreds[key] = value;
            }
          }

          const refreshed = await getOAuthApiKey(providerId, oauthCreds);
          if (refreshed) {
            this.data[providerId] = {
              type: "oauth",
              ...refreshed.newCredentials,
            };
            await this.persist();
            return refreshed.apiKey;
          }
        } catch {
          return undefined;
        }
      } else {
        return provider.getApiKey(cred);
      }
    }

    return undefined;
  }

  /** Check if any form of auth is configured */
  hasAuth(provider: string): boolean {
    return provider in this.data;
  }

  /** Get all registered OAuth providers */
  getOAuthProviders() {
    return getOAuthProviders();
  }
}
