# Utilities — Architecture Guide for LLMs

## Overview

A browser-based developer utilities app built as a plugin shell. The shell provides routing, theming, and a launcher grid. Each utility is a self-contained plugin that is lazy-loaded and code-split.

## Project Structure

```
src/
  main.tsx                  Entry point. Hydrates on "/" (SSG), createRoot otherwise.
  App.tsx                   Top-level providers: RegistryProvider → ThemeProvider → Routes.
  entry-server.tsx          SSR entry for pre-rendering. Uses StaticRouter. No AppUtilsProvider (toasts are client-only).
  types.ts                  Plugin and PluginMeta interfaces.
  registry.ts               React context for plugin registry. Exports RegistryProvider, usePlugins(), usePlugin(id).
  theme.tsx                 Theme context. Manages light/dark/system with localStorage persistence and system media query listener. SSR-safe (guards localStorage/matchMedia).
  index.css                 Tailwind v4 config: @theme tokens (colors, spacing), dark mode overrides, base layer reset, shimmer keyframe.

  shell/                    App chrome — shared across all plugins.
    HomePage.tsx            Landing page with centered app grid and theme switcher.
    AppPage.tsx             Plugin host: Header + Suspense-wrapped lazy component. Manages lazy cache and document title.
    Header.tsx              Thin top bar: home link, grid popover (controlled open/close), plugin name, theme switcher.
    AppGrid.tsx             Reusable grid of plugin icons. Supports compact (popover) and full (home) modes. Active plugin highlighting.
    ThemeSwitcher.tsx        Base UI Menu with RadioGroup for light/dark/system.

  components/               Shared UI primitives.
    Button.tsx              Button with variants: primary, secondary, danger, ghost, outline. Supports active state.
    ResizeHandle.tsx         Drag handle for resizable panels with GripVertical icon.
    SplitPanel.tsx          Generic two-panel horizontal layout using react-resizable-panels. Labels accept ReactNode.

  plugins/                  Built-in utilities.
    index.tsx               Plugin definitions array. Exports `plugins: Plugin[]`.
    skeletons.tsx           Shared loading skeletons (TwoPanelSkeleton).
    json-formatter/App.tsx  JSON format/minify tool.
    base64/App.tsx          Base64 encode/decode tool.
    hash-generator/         SHA hash generator.
      App.tsx               Main component. Text input + multi-file/folder drop. Web Worker hashing. Concurrency limit of 5.
      hash-worker.js        Web Worker for crypto.subtle.digest. Posts individual results as each algorithm completes.

  prerender.ts              SSG script. Builds SSR bundle, renders "/" to string, injects into dist/index.html.
```

## Key Architecture Decisions

### Plugin System

- Plugins are plain objects conforming to the `Plugin` interface in `types.ts`.
- Registered via React context (`RegistryProvider`), not global mutable state.
- The `load` function returns a dynamic `import()` — Vite code-splits each plugin into its own chunk.
- Lazy components are cached in a `Map<string, LazyExoticComponent>` in `AppPage.tsx` to avoid re-suspending on revisit.
- The optional `skeleton` function is bundled with the main app (not lazy) for instant loading UI.

### Plugin Interface

```ts
interface Plugin {
  id: string; // URL slug: /a/{id}
  name: string; // Display name
  icon: ReactNode; // Lucide icon, rendered at different sizes via [&>svg]:size-*
  meta: PluginMeta; // SEO: description (required), keywords, author, version
  load: () => Promise<{ default: ComponentType }>; // Lazy loader
  skeleton?: () => ReactNode; // Sync loading skeleton
}
```

### Remote/Federated Plugins

The same Plugin interface supports remote plugins. Just point `load` at a remote URL:

```ts
{
  id: "remote-tool",
  load: () => import(/* @vite-ignore */ "https://example.com/tool.js")
}
```

### SSG / Pre-rendering

- Only the home page (`/`) is pre-rendered at build time for SEO.
- Build pipeline: `tsc -b && vite build && tsx prerender.ts`.
- Inline `<script>` in `<head>` reads localStorage and applies `.dark` class before render (prevents FOUC).
- `main.tsx` checks `root.children.length > 0 && window.location.pathname === "/"` — only hydrates on home page; other routes get fresh `createRoot` render (avoids hydration mismatch).

### Theming

- All colors use semantic CSS custom properties (e.g., `--color-bg-surface`, `--color-primary`).
- Dark mode: `.dark` class on `<html>` overrides all color variables. Managed by `ThemeProvider`.
- Custom Tailwind v4 variant: `@custom-variant dark (&:where(.dark, .dark *))`.
- Never use raw color values (e.g., `text-red-500`). Always use token aliases (`text-danger`).
- Spacing uses `--spacing-*` tokens in Tailwind's `@theme` so they work as utilities: `p-sm`, `gap-tb`, `px-pn-x`, `h-hdr`, etc.

### Spacing Token Naming

Base scale: `xs` (4px), `sm` (8px), `md` (12px), `lg` (16px), `xl` (24px), `2xl` (32px), `3xl` (40px).
Semantic shortcuts:

- `hdr` / `hdr-x` — header height / inline padding
- `tb-x` / `tb-y` / `tb` — toolbar padding / gap
- `pn-x` / `pn-y` / `pn-lbl` — panel padding / label padding
- `gr` / `gr-p` / `gr-c` / `gr-cp` — grid gap / padding (full and compact)
- `mi-x` / `mi-y` — menu item padding

### CSS Layers

Custom reset styles MUST be in `@layer base` to avoid overriding Tailwind utilities. Unlayered CSS beats `@layer utilities`.

### Routing

- React Router v7 with `BrowserRouter` (client) / `StaticRouter` (SSR).
- `/` → HomePage, `/a/:id` → AppPage.
- `Suspense key={id}` forces remount when switching plugins.
- SPA fallback via `public/_redirects` for Cloudflare Pages.

### UI Components

- Base UI (`@base-ui/react` v1.2.0) for accessible unstyled components: Popover, Menu, Toolbar, Tooltip.
- `Toolbar.Button` must use function render pattern: `render={(props) => <Button {...props}>text</Button>}`.
- Custom `Button` component with variant system.
- `SplitPanel` component wraps `react-resizable-panels` for two-panel layouts. Labels accept `ReactNode`.
- Icons from `lucide-react`.

### react-resizable-panels

- Files importing from `react-resizable-panels` MUST have `"use no memo"` directive at top (React Compiler conflict).
- API uses `Group` (not PanelGroup), `Separator` (not PanelResizeHandle), `orientation` (not direction).
- `SplitPanel.tsx` has the directive and encapsulates this dependency — plugins should use `SplitPanel` instead of importing directly.

### Hash Generator Plugin

- Supports text input and multi-file/folder hashing.
- Text: typed in textarea, hashed directly via `crypto.subtle.digest` on main thread.
- Files: read in streaming chunks (progress reporting), then buffer transferred to Web Worker for hashing (zero-copy via Transferable).
- Folder drop: uses `webkitGetAsEntry()` + recursive `FileSystemDirectoryReader` to collect all nested files.
- Concurrency: max 5 files processed simultaneously (worker-pool pattern). Memory bounded — each file's chunks/buffer freed after hashing.
- Worker posts individual algorithm results as they complete (`Promise.all` for parallel computation within one file).
- Inline "copied!" feedback with 1.5s timeout on copy actions.
- Progress bar with shimmer animation during file processing.

## Conventions

- All files use `.tsx` extension if they contain JSX (including plugin registration).
- Plugin components are default exports (required by `React.lazy`).
- Shared skeletons live in `plugins/skeletons.tsx`, not inside individual plugin folders.
- Two-panel layout via `SplitPanel` component is the common pattern for text-transform utilities.
- No `app-utils.tsx` / toast provider — clipboard operations use `navigator.clipboard` directly with inline feedback.
- Dynamic `document.title` for browser tab UX; SEO meta only in build-time `index.html`.

## Deployment

Cloudflare Pages via wrangler. Config in `wrangler.jsonc`. Deploy with `pnpm run deploy`.
