# Design System

This document describes the visual design system introduced in the 2026-07 UI/UX refresh. The design direction is **minimal editorial** — generous whitespace, typography-led hierarchy, and a restrained palette suited to a research/evidence product (think academic journal meets Linear/Notion).

## Principles

1. **Typography does the work.** Hierarchy comes from the three type voices below, not from color or decoration.
2. **One accent color, used sparingly.** `brand` (ink blue) is reserved for links and selection states. Buttons stay near-black (`primary`).
3. **Color carries meaning, not decoration.** Chromatic tokens (`positive`, `negative`, `caution`, `star`) are semantic and map to evidence effects and ratings.
4. **Hairlines over boxes.** Prefer `border-b` / `divide-y` separators and whitespace to cards and heavy shadows.
5. **No hardcoded palette colors.** Never use `text-gray-*`, `bg-white`, `text-blue-600`, etc. in scope. Always use the tokens below so surfaces stay themeable.

## Typography — the three voices

Fonts are loaded via `next/font/google` in `app/[lang]/layout.tsx` and exposed as CSS variables on `<html>`. Japanese glyphs fall through the font-family chain to Noto — no locale-specific font switching is needed.

| Voice     | Utility                           | Fonts (fallback chain)               | Use for                                                                                       |
| --------- | --------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| Display   | `font-display`                    | Newsreader → Noto Serif JP → Georgia | Page titles (h1), section display headings, empty/error state titles, footer wordmark         |
| Body / UI | `font-sans` (default on `<body>`) | Geist → Noto Sans JP                 | Everything else                                                                               |
| Data      | `font-mono`                       | Geist Mono                           | Dates, versions, IDs, counts, eyebrow labels, level names — anything that reads as "a record" |

Conventions:

- Display headings: `font-display text-4xl leading-tight tracking-tight text-balance` (scale up to `text-5xl`–`text-7xl` for hero/landing).
- Eyebrow labels (the editorial kicker above a title): `font-mono text-xs tracking-widest uppercase text-muted-foreground`.
- Do **not** set serif headings globally (e.g. in `@layer base`); apply `font-display` explicitly so `.prose` articles and canvas nodes are unaffected.
- Noto fonts are loaded with `preload: false` — their subsets are large and preloading hurts LCP.

## Color tokens

Defined in `app/globals.css` (`:root` + `@theme inline`). All values are oklch. `.dark` currently mirrors the light values for the new tokens (dark mode is out of scope).

### Base (shadcn neutral, unchanged)

`background`, `foreground`, `card`, `muted`, `muted-foreground`, `border`, `primary` (near-black), `secondary`, `accent`, `destructive`, etc.

### Added semantic tokens

| Token              | Value                   | Meaning / usage                                                                                                                                                      |
| ------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brand`            | `oklch(0.42 0.075 230)` | Ink blue. Links (`text-brand underline underline-offset-4`), selected states (canvas node selection, evidence edge chips), info tints (`bg-brand/5 border-brand/20`) |
| `brand-foreground` | `oklch(0.985 0 0)`      | Text on solid `brand` fills                                                                                                                                          |
| `positive`         | `oklch(0.55 0.12 155)`  | "Positive" effect icon, success states (IPFS saved)                                                                                                                  |
| `negative`         | `oklch(0.55 0.16 25)`   | "No effect" icon                                                                                                                                                     |
| `caution`          | `oklch(0.68 0.14 60)`   | "Side effect" icon, warning tints (`bg-caution/10 border-caution/40`)                                                                                                |
| `neutral-effect`   | `oklch(0.556 0 0)`      | "Unclear" / "Mixed" effect icons                                                                                                                                     |
| `star`             | `oklch(0.8 0.15 85)`    | Strength-of-evidence stars (`fill-star text-star`)                                                                                                                   |

Usage rules:

- `caution` is too light for small text on light backgrounds — use it for icons and tinted surfaces, and keep the text itself `text-foreground/80`.
- Error text uses `destructive`, not `negative` (`negative` is the evidence-effect semantic).
- Inline styles / SVG attributes (React Flow edges, backgrounds) use the CSS variable form: `var(--color-brand)`, `var(--color-border)`, `var(--color-muted-foreground)`.

### Hardcoded → token mapping (for future migrations)

| Legacy class                         | Token replacement                                               |
| ------------------------------------ | --------------------------------------------------------------- |
| `text-gray-900/800`                  | `text-foreground`                                               |
| `text-gray-700…400`                  | `text-muted-foreground` (or `text-foreground/80` for body text) |
| `text-gray-300`                      | `text-border`                                                   |
| `bg-white`                           | `bg-background` (page) / `bg-card` (surfaces)                   |
| `bg-gray-50/100/200`                 | `bg-muted/50` / `bg-muted`                                      |
| `border-gray-200/300`                | `border`                                                        |
| `text-blue-600/900`                  | `text-brand`                                                    |
| `bg-blue-600`                        | `bg-brand hover:bg-brand/90`                                    |
| `bg-blue-50` / `border-blue-200`     | `bg-brand/5` / `border-brand/20`                                |
| `green/red/orange-500`, `yellow-400` | `positive` / `negative` / `caution` / `star`                    |

## Shared components

All presentational, no logic. Reuse these instead of hand-rolling state UI.

| Component      | Location                       | Purpose                                                                                                                |
| -------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `PageHeader`   | `components/page-header.tsx`   | Editorial page heading: eyebrow + `font-display` title + lede + hairline rule. Used on /effects, /strength-of-evidence |
| `SectionLabel` | `components/section-label.tsx` | Small mono uppercase section heading (evidence detail metadata sections)                                               |
| `EmptyState`   | `components/empty-state.tsx`   | icon + title + description + optional action (search no-results)                                                       |
| `ErrorState`   | `components/error-state.tsx`   | title + description + mono `detail` (digest/ID) + action children (canvas error boundary, IPFS load failures)          |
| `LoadingState` | `components/loading-state.tsx` | `ui/spinner` + label, centered. Replaces hand-rolled spinners                                                          |
| `Footer`       | `components/footer.tsx`        | Global footer; returns `null` under `/canvas` (full-screen editor)                                                     |

Skeletons: use `components/ui/skeleton.tsx` (see `app/[lang]/evidence/[slug]/loading.tsx`) — never hand-rolled `bg-gray-200 animate-pulse` divs.

## Recurring patterns

- **Ledger lists**: hairline-divided rows (`divide-y`) with a mono meta line (date + stars). See the hero's "Latest evidence" aside and evidence detail results.
- **Meta rows**: `font-mono text-xs text-muted-foreground` with `/` separators in `text-border` (see `EvidenceHeader`).
- **Definition lists**: `<dl>` + `divide-y`, term in display/mono voice, description in `text-muted-foreground` (see /effects, /strength-of-evidence).
- **Tinted callouts**: `border-{token}/30-40 bg-{token}/5-10 rounded-md border` with `text-foreground/80` content (canvas warnings, info notes).
- **Link cards**: `rounded-xl border p-4 hover:bg-accent/40 transition-colors` with a `text-muted-foreground` trailing `ArrowUpRight` (AttachedLinks, AttestationHistory).

## Scope notes & guardrails

- **Hypercerts surfaces are intentionally untouched** by the refresh: `app/[lang]/hypercerts/`, `app/[lang]/canvas/mint-hypercert/`, `components/hypercerts/`, `components/extra-content.tsx`. Migrate them to tokens if they come back into scope.
- **Canvas node `data.color`** is user data (card header color) — never restyle it.
- Canvas edge stroke for newly created edges is set in `components/canvas/context/canvas-operations.ts` (`var(--color-muted-foreground)`); previously saved canvases may still embed the legacy `#6b7280`, which is visually equivalent.
- Image export (html-to-image) captures computed styles, so token changes propagate to exported PNGs automatically — verify exports when changing surface colors.
- Dark mode: `.dark` token blocks exist but there is no `ThemeProvider`; the new semantic tokens hold placeholder (light) values. Define real dark values before enabling theming.
- i18n: any new UI text needs keys in **both** `messages/en.json` and `messages/ja.json`. Eyebrow labels stay in English (uppercase mono) in both locales as an editorial device.
