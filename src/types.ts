import type { ComponentType, ReactNode } from "react";

export interface PluginMeta {
  description: string;
  keywords?: string[];
  author?: string;
  version?: string;
}

export interface Plugin {
  id: string;
  name: string;
  icon: ReactNode;
  meta: PluginMeta;
  load: () => Promise<{ default: ComponentType }>;
  skeleton?: () => ReactNode;
}
