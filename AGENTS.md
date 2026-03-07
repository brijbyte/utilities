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
    Select.tsx              Generic Select dropdown wrapping Base UI Select. Props: value, onValueChange, options ({value, label}[]), align, triggerClassName, popupMinWidth.
    SplitPanel.tsx          Generic two-panel horizontal layout using react-resizable-panels. Labels accept ReactNode.

  plugins/                  Built-in utilities.
    index.tsx               Plugin definitions array. Exports `plugins: Plugin[]`.
    skeletons.tsx           Shared loading skeletons (TwoPanelSkeleton).
    json-formatter/App.tsx  JSON format/minify tool.
    base64/App.tsx          Base64 encode/decode tool.
    hash-generator/         SHA hash generator.
      App.tsx               Main component. Text input + multi-file/folder drop. Web Worker hashing. Concurrency limit of 5.
      hash-worker.js        Web Worker for crypto.subtle.digest. Posts individual results as each algorithm completes.
    emi-calculator/         Full-featured loan EMI calculator — single scrollable page with collapsible config panels.
      App.tsx               Root component. All state + derived calculations. Orchestrates sections and secondary views.
      utils/
        emi.ts              Pure calculation engine (no React). EMI formula, reverse-solve tenure, full amortisation with prepayments + floating rates, home purchase, fees/APR, affordability, scenario compare, CSV export, URL serialization.
        format.ts           Pure formatting module: LocalePreset, Fmt interface, createFmt(), PRESET_ITEMS. Presets: auto (device), ₹ Indian, $ US, € Euro, £ British, ¥ Japanese. No React.
        types.ts            SecondaryView type, SavedScenario interface, localStorage helpers.
      components/
        FormatContext.tsx   React context for locale-aware formatting. FormatProvider wraps the calculator, useFormat() hook returns { fmt, setLocale }. Persists choice in localStorage.
        ui.tsx              Shared UI primitives: SliderField, NumberField, MonthYearField, DonutChart, SummaryCard, CollapsibleGroup, Collapsible, TabBtn, Section, CopyBtn.
        charts.tsx          Pure SVG chart components: BalanceLineChart (with prepayment comparison overlay), PrincipalInterestChart (stacked bars by year).
        PrintView.tsx       Printable report: opens new window with self-contained HTML (inline styles, hardcoded colors). Donut, balance line, stacked bar charts + full schedule table. PrintButton component triggers it.
        InputsSection.tsx   Solve-mode toggle, currency/locale Select (Base UI), loan sliders, start date.
        ResultsSection.tsx  Donut chart, summary cards, prepayment savings, fees summary.
        ChartsSection.tsx   Balance-over-time and principal-vs-interest chart wrappers.
        ScheduleSection.tsx Amortisation schedule with year-grouped accordion, search, year filter, sticky totals, CSV export.
        HomeLoanPanel.tsx   Home purchase collapsible panel: property price, down payment %, LTV, stamp duty.
        PrepaymentPanel.tsx Prepayment collapsible panel: lump-sum + recurring editors, strategy toggle, savings summary.
        RateChangePanel.tsx Rate change collapsible panel: floating-rate timeline editor.
        FeesPanel.tsx       Fees collapsible panel: processing fee, insurance, legal, GST, effective APR.
        AffordabilityTab.tsx Secondary view: income/obligation inputs, FOIR-based max EMI/loan, DTI bar.
        CompareTab.tsx      Secondary view: up to 3 scenarios side-by-side with diff table.
        ShareTab.tsx        Secondary view: save to localStorage, share via URL, copy summary.
        Skeleton.tsx        Loading skeleton.

  prerender.js              SSG script. Builds SSR bundle, renders "/" to string, injects into dist/index.html.
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
- Semantic tokens reference Tailwind v4 built-in palette via `var(--color-stone-*)`, `var(--color-blue-*)`, etc.
- Base palette: **stone** (neutrals), **blue** (primary/accent), **red** (danger), **green** (success).
- Dark mode: `.dark` class on `<html>` overrides all color variables. Managed by `ThemeProvider`.
- Custom Tailwind v4 variant: `@custom-variant dark (&:where(.dark, .dark *))`.
- Never use raw color values (e.g., `text-red-500`). Always use token aliases (`text-danger`).
- Never hardcode hex/oklch in `@theme` when a Tailwind built-in color exists — use `var(--color-stone-*)` etc.
- Spacing uses Tailwind v4's built-in numeric multiplier (`--spacing: 0.25rem`) for the base scale: `p-1` (4px), `gap-2` (8px), `p-3` (12px), `m-4` (16px), `gap-6` (24px), `p-8` (32px), `m-10` (40px).
- Custom semantic `--spacing-*` tokens in `@theme` for app-specific shortcuts: `gap-tb`, `px-pn-x`, `h-hdr`, etc.
- **Do NOT define `--spacing-xs/sm/md/lg/xl/2xl/3xl`** in `@theme` — these names collide with built-in Tailwind tokens (radius, shadow, text size, containers all share these suffixes). Use numeric values instead.

### Spacing Token Naming

Numeric scale (Tailwind built-in): `1` (4px), `2` (8px), `3` (12px), `4` (16px), `6` (24px), `8` (32px), `10` (40px).
Semantic shortcuts (custom `--spacing-*` in `@theme`):

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

### EMI Calculator Plugin

Full-featured loan EMI calculator with home purchase mode, prepayments, floating rates, fees, affordability analysis, charts, scenario comparison, and save/share.

#### File Structure

```
plugins/emi-calculator/
  App.tsx                       Root: all state, derived calcs, orchestrates layout sections + secondary views.
  utils/
    emi.ts                      Pure calculation engine. No React, no side effects.
    format.ts                   Pure formatting: LocalePreset, Fmt interface, createFmt(), PRESET_ITEMS. No React.
    types.ts                    SecondaryView type, SavedScenario, localStorage helpers.
  components/
    FormatContext.tsx            React context: FormatProvider + useFormat() hook. Locale persisted in localStorage.
    ui.tsx                      Shared UI primitives (SliderField, NumberField, DonutChart, SummaryCard, Collapsible, etc).
    charts.tsx                  SVG chart components (no external charting library).
    InputsSection.tsx           Solve-mode toggle, currency Select (Base UI), loan sliders, start date.
    ResultsSection.tsx          Donut chart, summary cards, prepayment/fees summaries.
    ChartsSection.tsx           Wraps BalanceLineChart + PrincipalInterestChart with headings.
    ScheduleSection.tsx         Amortisation schedule table with accordion, search, filter, CSV export.
    HomeLoanPanel.tsx           Home purchase collapsible panel content.
    PrepaymentPanel.tsx         Prepayment collapsible panel content.
    RateChangePanel.tsx         Rate change collapsible panel content.
    FeesPanel.tsx               Fees collapsible panel content.
    AffordabilityTab.tsx        Secondary view: affordability calculator.
    CompareTab.tsx              Secondary view: scenario comparison.
    ShareTab.tsx                Secondary view: save & share.
    Skeleton.tsx                Loading skeleton.
```

#### Page Layout

Single scrollable page — no tabs. All inputs and results are visible together. Optional configuration is layered in via collapsible accordion panels (Base UI `Accordion`) with activity badges:

1. **Inputs** (always visible) — Solve-mode toggle (EMI vs tenure), loan amount / rate / tenure sliders, start date.
2. **Collapsible config panels** — Each has an icon, title, and badge showing active state:
   - **Home Purchase** — Badge: "Active" when enabled. Replaces loan amount slider with property price + down payment.
   - **Prepayments** — Badge: count of configured prepayments. Lump-sum and recurring editors.
   - **Rate Changes** — Badge: count of rate segments. Floating-rate timeline editor.
   - **Fees & Charges** — Badge: effective APR when fees > 0. Processing fee, insurance, legal, GST.
3. **Results** (always visible) — Donut chart, summary cards (EMI, interest, total, tenure), prepayment savings, fees summary.
4. **Charts** (always visible) — Balance-over-time line chart (with prepayment comparison overlay) and principal-vs-interest stacked bars by year.
5. **Schedule** (always visible) — Full amortisation table with search, year filter, sticky totals, CSV export.
6. **More Tools** — Subtle divider with buttons leading to secondary views:
   - **Affordability** — Income/FOIR-based max EMI/loan calculator (separate view).
   - **Compare** — Up to 3 scenarios side-by-side (separate view).
   - **Save & Share** — Save to localStorage, share via URL, copy summary (separate view).

Secondary views replace the page content with a "← Back to calculator" link.

#### Calculation Engine (`emi.ts`)

**Core functions:**

- `computeEmi(principal, rate, tenure)` — Standard EMI formula: `P × r × (1+r)^n / ((1+r)^n − 1)`.
- `computeTenureFromEmi(principal, rate, emi)` — Reverse solve using logarithmic formula.
- `calculateFull(input)` — Full amortisation with prepayments and rate timeline. Iterates month-by-month, applies prepayments, recomputes EMI on rate changes or reduce-EMI strategy.
- `calculateHomePurchase(input)` — Property price → down payment → LTV ratio → stamp duty estimate.
- `calculateTotalFees(principal, fees)` → `calculateEffectiveApr(principal, emi, tenure, fees)` — Newton-Raphson APR solver.
- `calculateAffordability(input)` — FOIR-based max EMI/loan with safety recommendation.
- `evaluateScenario(scenario)` — Wraps `calculateFull` for compare mode, adds effective APR.
- `aggregateByYear(schedule, startMonth, startYear)` — Year-level aggregation for bar charts.
- `scheduleToCSV()` / `encodeShareURL()` / `decodeShareURL()` / `generateSummaryText()` — Export/share utilities.

**Prepayment logic:**

- Lump sums applied at exact month. Recurring checked per-month against frequency.
- Two strategies: `reduce-tenure` (keep EMI, pay off faster) and `reduce-emi` (recompute lower EMI on remaining balance).
- Savings computed by comparing with/without prepayment results.

**Rate timeline:**

- `RateSegment[]` with `fromMonth` and `annualRate`. EMI recomputed on remaining balance/tenure at each rate boundary.

#### Charts (`charts.tsx`)

Pure SVG, no external dependencies. Both charts are responsive (`viewBox` + `w-full`).

- **`BalanceLineChart`** — Plots outstanding balance over months. Optional `compareSchedule` prop renders a dashed overlay (without-prepayment baseline). Area fill under main line.
- **`PrincipalInterestChart`** — Stacked bars per calendar year showing principal (blue), interest (light blue), and prepayment (green) breakdown.

#### Schedule UX

- Grouped by calendar year in `Accordion` (Base UI).
- Year headers show compact totals (principal, interest, prepayment, closing balance).
- **Search** — Filter months by text (e.g. "Jan", "2028").
- **Year filter** — Dropdown to show a single year.
- **Sticky totals** — Summary row pinned at top of schedule section.
- **CSV export** — Downloads `emi-schedule.csv` with all columns including rate.
- **Rate column** — Each month shows the interest rate in effect.
- **Prepayment highlight** — Months with prepayments get a green-tinted background.

#### Component Architecture

- **App.tsx** owns all state (`useState` hooks) and derived calculations (`useMemo`). Orchestrates section components and collapsible panels. Secondary views (affordability, compare, share) replace the page via conditional rendering.
- **Section components** (`InputsSection`, `ResultsSection`, `ChartsSection`) are pure presentational — they receive data and callbacks as props, render a logical section of the main page.
- **Panel components** (`*Panel.tsx`) are pure presentational — they receive data and callbacks as props, render content inside collapsible panels.
- **Tab components** (`*Tab.tsx`) are for secondary views — also pure presentational, rendered in place of the main page.
- **ui.tsx** contains shared primitives including `CollapsibleGroup` and `Collapsible` components (Base UI `Accordion` with chevron rotation and optional badge).
- **types.ts** defines `SecondaryView` union type and `SavedScenario` interface.
- **ScheduleSection.tsx** is self-contained with its own search/filter state, but receives the calculation result as props.

#### State Management

- All state lives in `useState` hooks at the top of `EmiCalculator` in App.tsx.
- Cross-tab state sharing: affordability rate/tenure sync from main inputs; home mode feeds into principal.
- URL restore: `decodeShareURL(window.location.search)` on mount initializes state from query params.
- Saved scenarios: `localStorage` key `emi-calc-saved`, persisted as JSON array of `SavedScenario` objects.

### TOTP Authenticator Plugin

Offline-first TOTP authenticator with encrypted storage and optional Google Drive sync.

#### File Structure

```
plugins/totp/
  App.tsx                       Entry point. Wraps in StorageProvider, renders state-based UI.
  utils/
    crypto.ts                   Encryption layer. Password → PBKDF2 → MK → AES-256-GCM.
    biometrics.ts               WebAuthn PRF convenience unlock. Derives wrapping key, NOT root of trust.
    drive-sync.ts               Google Drive appDataFolder upload/download of encrypted blobs.
    google-auth.ts              Google Identity Services token management (implicit grant, no backend).
    google-auth.d.ts            Type declarations for GIS SDK.
    db.ts                       Legacy plaintext IndexedDB store (migrated on vault creation).
    totp.ts                     TOTP code generation via crypto.subtle HMAC.
    qr.ts                       OTPAuth URI parser + image QR scanner.
    qr-import.ts                QR import orchestration (URI parse + image decode).
    pending-uri.ts              Pending URI state for cross-component sharing.
    storage-ctx.ts              Context object (split out to avoid circular imports).
    useStorage.ts               Hook to consume StorageContextValue.
  components/
    StorageContext.tsx           Core state machine + React context. Manages vault lifecycle, accounts, sync.
    SetupScreen.tsx             First-launch: "Start Fresh" or "Restore from Google Drive".
    LockScreen.tsx              Password entry + biometric unlock button.
    SettingsDialog.tsx          Biometric toggle, vault info, lock button.
    TotpToolbar.tsx             Toolbar: Google sync status, settings, scan/upload buttons.
    GoogleSyncButton.tsx        Google Drive link/unlink/sync UI.
    ScanDialog.tsx              Camera QR scanner dialog.
    Scanner.tsx                 Camera access + jsQR frame scanning loop.
    AccountList.tsx             Grid of account cards (empty state or grid).
    AccountItem.tsx             Single account: issuer icon, TOTP code, countdown, copy, delete.
    Skeleton.tsx                Loading skeletons for the TOTP grid and full app.
```

#### Security Architecture

**Password-first model.** The password is the root of trust. Biometrics is a per-device convenience layer.

```
Password → PBKDF2 (600k iterations, SHA-256) → Master Key (MK)
  │
  ├── MK encrypts/decrypts accounts via AES-256-GCM (random 12-byte IV per write)
  ├── MK verified via encrypted known-plaintext verifier (not stored raw)
  └── MK optionally wrapped with biometric PRF key for quick unlock
```

**Key design decisions:**

- MK is extractable (needed for bio wrapping export) but never persisted in plaintext.
- MK only lives in JS memory while the vault is unlocked.
- Password change re-derives MK, re-encrypts all data, invalidates biometric wrapping.
- Biometric key wraps MK with AES-GCM (not AES-KW) using the PRF-derived key.

#### Vault State Machine

```
LOADING → check IndexedDB for vault meta
  ├─ No vault found → FRESH (SetupScreen)
  │   ├─ "Start Fresh" → set password → encrypt → UNLOCKED
  │   └─ "Restore from Drive" → OAuth → find blob → enter password → decrypt → UNLOCKED
  └─ Vault exists → LOCKED (LockScreen)
      ├─ Enter password → PBKDF2 → verify → UNLOCKED
      └─ Biometric tap (if enabled) → PRF → unwrap MK → UNLOCKED
      │
      UNLOCKED → can add/remove accounts, enable bio, enable sync, lock
```

State is managed in `StorageContext.tsx` via `vaultState: "loading" | "fresh" | "locked" | "unlocked"`.

#### IndexedDB Layout

Two databases:

- **`totp-authenticator`** (legacy): plaintext `accounts` store. Migrated on vault creation, then cleared.
- **`totp-vault`**: encrypted vault with two object stores:
  - `meta` store:
    - `vault-meta` → `{ salt, verifierIv, verifier, accountCount, updatedAt }`
    - `vault-bio` → `{ iv, wrappedMK }` (optional, per-device)
  - `data` store:
    - `vault-data` → `{ iv, ciphertext }` (AES-256-GCM encrypted accounts JSON)

#### Biometric Unlock Flow

1. `registerBiometrics()` → WebAuthn `navigator.credentials.create()` with PRF extension
2. PRF output → HKDF → AES-256-GCM wrapping key
3. Export MK raw bytes → AES-GCM encrypt with wrapping key → store as `vault-bio`
4. On unlock: `authenticateBiometrics()` → PRF → same wrapping key → decrypt `vault-bio` → MK

**PRF not supported?** Biometric toggle shows error. Password remains the only unlock method.
Each device creates its own passkey + wrapping. The password is the cross-device universal fallback.

#### Google Drive Sync

- Uses `appDataFolder` scope (hidden app-specific folder, not visible to user).
- Stores a single JSON file (`totp-vault.json`) containing the `EncryptedBlob`.
- `EncryptedBlob` format: `{ version, salt, verifierIv, verifier, dataIv, ciphertext, accountCount, updatedAt }` — all binary fields are base64-encoded.
- The blob includes the PBKDF2 salt and verifier, so a new device can re-derive MK from the password alone.
- On link: if remote blob exists and is newer, attempts merge (decrypt remote with current MK, dedupe by issuer+label+secret, re-upload merged).
- On each account add/remove: local vault is written first, then blob is exported and uploaded.
- Google auth uses GIS implicit grant (no backend). Token stored in localStorage with expiry tracking. Silent refresh attempted on mount.

#### Restore Flow (New Device)

1. User picks "Restore from Google Drive" on SetupScreen.
2. OAuth consent → fetch `totp-vault.json` from `appDataFolder`.
3. Show backup metadata (account count, last sync date) — readable without password.
4. User enters password → PBKDF2 with stored salt → verify against verifier → decrypt accounts.
5. Store vault locally in IndexedDB → mark sync enabled → transition to UNLOCKED.

#### TOTP Generation

- RFC 6238 compliant. Supports SHA-1, SHA-256, SHA-512 algorithms.
- 6 or 8 digit codes. Configurable period (default 30s).
- Uses `crypto.subtle.sign("HMAC", ...)` — no external TOTP library.
- Base32 decoding for secrets (standard otpauth format).
- Countdown progress bar per account (CSS width transition, updated every 1s).

#### QR Code Handling

- Camera scanning: `getUserMedia` → canvas frame capture → `jsQR` library.
- Image upload: `File` → `Image` → canvas → `jsQR`.
- Parses `otpauth://totp/...` URIs. Extracts issuer, label, secret, algorithm, digits, period.
- Deduplication on import: checks (secret + issuer + label) triple.

## Conventions

- All files use `.tsx` extension if they contain JSX (including plugin registration).
- Plugin components are default exports (required by `React.lazy`).
- Shared skeletons live in `plugins/skeletons.tsx`, not inside individual plugin folders.
- Two-panel layout via `SplitPanel` component is the common pattern for text-transform utilities.
- No `app-utils.tsx` / toast provider — clipboard operations use `navigator.clipboard` directly with inline feedback.
- Dynamic `document.title` for browser tab UX; SEO meta only in build-time `index.html`.

## Deployment

Cloudflare Pages via wrangler. Config in `wrangler.jsonc`. Deploy with `pnpm run deploy`.
