# Utilities — Architecture Guide for LLMs

## Overview

A browser-based developer utilities app built as a plugin shell. The shell provides routing, theming, and a launcher grid. Each utility is a self-contained plugin that is lazy-loaded and code-split.

## Project Structure

```
src/
  main.tsx                  Entry point. Renders <App />.
  App.tsx                   Top-level providers: RegistryProvider → ThemeProvider → BrowserRouter.
  types.ts                  Plugin and PluginMeta interfaces.
  registry.ts               React context for plugin registry. Exports RegistryProvider, usePlugins(), usePlugin(id).
  theme.tsx                 Theme context. Manages light/dark/system with localStorage persistence and system media query listener.
  index.css                 Tailwind v4 config: @theme tokens (colors, spacing), dark mode overrides, base layer reset.

  shell/                    App chrome — shared across all plugins.
    HomePage.tsx            Landing page with centered app grid and theme switcher.
    AppPage.tsx             Plugin host: Header + Suspense-wrapped lazy component. Manages lazy cache and document meta tags.
    Header.tsx              Thin top bar: grid popover (with backdrop + arrow), plugin name, theme switcher.
    AppGrid.tsx             Reusable grid of plugin icons. Supports compact (popover) and full (home) modes. Tooltips show descriptions.
    ThemeSwitcher.tsx        Base UI Menu with RadioGroup for light/dark/system.

  components/               Shared UI primitives.
    Button.tsx              Button with variants: primary, secondary, danger, ghost, outline. Supports active state.

  plugins/                  Built-in utilities.
    index.tsx               Plugin definitions array. Exports `plugins: Plugin[]`.
    skeletons.tsx           Shared loading skeletons (TwoPanelSkeleton).
    json-formatter/App.tsx  JSON format/minify tool.
    base64/App.tsx          Base64 encode/decode tool.
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
  id: string; // URL slug: /app/{id}
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

### Theming

- All colors use semantic CSS custom properties (e.g., `--color-bg-surface`, `--color-primary`).
- Dark mode: `.dark` class on `<html>` overrides all color variables. Managed by `ThemeProvider`.
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

- React Router v7 with `BrowserRouter`.
- `/` → HomePage, `/app/:id` → AppPage.
- `Suspense key={id}` forces remount when switching plugins.
- SPA fallback via `public/_redirects` for Cloudflare Pages.

### UI Components

- Base UI (`@base-ui/react`) for accessible unstyled components: Popover, Menu, Tooltip.
- Custom `Button` component with variant system.
- Icons from `lucide-react`.

## Conventions

- All files use `.tsx` extension if they contain JSX (including plugin registration).
- Plugin components are default exports (required by `React.lazy`).
- Shared skeletons live in `plugins/skeletons.tsx`, not inside individual plugin folders.
- Two-panel layout (input/output with toolbar) is the common pattern for text-transform utilities.

## Deployment

Cloudflare Pages via wrangler. Config in `wrangler.jsonc`. Deploy with `pnpm run deploy`.
