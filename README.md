# utilities

Developer tools in the browser. A collection of small, focused utilities accessible from a single app with a plugin-based architecture.

**Live:** [utilities.brijbyte.com](https://utilities.brijbyte.com)

## Available Utilities

- **JSON Formatter** — Format, validate, and minify JSON with configurable indentation
- **Base64** — Encode and decode Base64 strings with full UTF-8 support

## Stack

- React 19 + TypeScript
- Tailwind CSS v4 with custom theme tokens (colors, spacing)
- Base UI for unstyled accessible components (Popover, Menu, Tooltip)
- Lucide React for icons
- Vite 8 with React Compiler
- Cloudflare Pages for hosting

## Development

```bash
pnpm install
pnpm dev
```

## Build & Deploy

```bash
pnpm build          # Type-check + Vite build
pnpm run deploy     # Build + deploy to Cloudflare Pages (production)
pnpm run deploy:preview  # Build + deploy preview branch
```

## Adding a Plugin

Each utility is a plugin. To add one:

1. Create `src/plugins/<id>/App.tsx` with a default export component
2. Register it in `src/plugins/index.tsx`:

```tsx
import { SomeIcon } from "lucide-react";

{
  id: "my-tool",
  name: "My Tool",
  icon: <SomeIcon size={24} />,
  meta: {
    description: "What this tool does",
    keywords: ["relevant", "keywords"],
  },
  load: () => import("./my-tool/App"),
  skeleton: () => <TwoPanelSkeleton />,  // optional
}
```

The plugin's component is lazy-loaded and code-split automatically. The `skeleton` renders instantly while the chunk loads.

## Theming

Colors and spacing are defined as CSS custom properties in `src/index.css` via Tailwind's `@theme`. Light and dark modes are supported, switchable via the header menu.

**Color tokens:** `bg`, `bg-surface`, `bg-hover`, `border`, `text`, `text-muted`, `primary`, `secondary`, `danger`, `success`, `accent`

**Spacing tokens:** `xs` (4px), `sm` (8px), `md` (12px), `lg` (16px), `xl` (24px), `2xl` (32px), `3xl` (40px) + semantic shortcuts like `hdr`, `tb-x`, `pn-x`, `gr`, etc.

## License

MIT
