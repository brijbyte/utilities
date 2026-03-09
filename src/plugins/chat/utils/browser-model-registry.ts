/**
 * Browser-compatible model registry.
 *
 * Loads built-in models from @mariozechner/pi-ai and uses the
 * BrowserAuthStorage for API key resolution.
 */

import type { Api, Model } from "@mariozechner/pi-ai";
import {
  getModels,
  getProviders,
  type KnownProvider,
} from "@mariozechner/pi-ai";
import type { BrowserAuthStorage } from "./browser-auth-storage";

export class BrowserModelRegistry {
  private models: Model<Api>[] = [];
  private authStorage: BrowserAuthStorage;

  constructor(authStorage: BrowserAuthStorage) {
    this.authStorage = authStorage;
    this.loadModels();
  }

  private loadModels(): void {
    this.models = getProviders().flatMap(
      (provider) => getModels(provider as KnownProvider) as Model<Api>[],
    );

    // Let OAuth providers modify their models
    for (const oauthProvider of this.authStorage.getOAuthProviders()) {
      const cred = this.authStorage.get(oauthProvider.id);
      if (cred?.type === "oauth" && oauthProvider.modifyModels) {
        this.models = oauthProvider.modifyModels(this.models, cred);
      }
    }
  }

  /** Reload models (e.g., after login/logout) */
  refresh(): void {
    this.loadModels();
  }

  /** Get all models */
  getAll(): Model<Api>[] {
    return this.models;
  }

  /** Get only models that have auth configured */
  getAvailable(): Model<Api>[] {
    return this.models.filter((m) => this.authStorage.hasAuth(m.provider));
  }

  /** Get available providers that have at least one model with auth */
  getAvailableProviders(): string[] {
    const providers = new Set<string>();
    for (const m of this.models) {
      if (this.authStorage.hasAuth(m.provider)) {
        providers.add(m.provider);
      }
    }
    return Array.from(providers);
  }

  /** Find a model by provider and ID */
  find(provider: string, modelId: string): Model<Api> | undefined {
    return this.models.find((m) => m.provider === provider && m.id === modelId);
  }

  /** Get API key for a model */
  async getApiKey(model: Model<Api>): Promise<string | undefined> {
    return this.authStorage.getApiKey(model.provider);
  }

  /** Check if a model is using OAuth credentials */
  isUsingOAuth(model: Model<Api>): boolean {
    const cred = this.authStorage.get(model.provider);
    return cred?.type === "oauth";
  }
}
