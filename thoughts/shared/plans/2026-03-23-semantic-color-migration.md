# Full Semantic Color Migration & Padding Standardization

## Overview

Remove every hardcoded Tailwind color class (`slate-*`, `blue-*`, `red-*`, `teal-*`, `amber-*`, `emerald-*`) and hardcoded hex/rgba values from all UI components, replacing them with the semantic token system. Standardize padding across all card and panel elements for visual consistency.

## Current State Analysis

### Colors
- **12 component files** still contain hardcoded Tailwind palette colors (primarily `slate-*` and `blue-*`)
- Semantic tokens exist for: `background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`
- **Missing tokens**: No `success` or `warning` tokens — needed to replace `teal-*`/`emerald-*` (active/positive states) and `amber-*` (caution states)
- **GraphCanvas.tsx** uses hex colors in sigma.js config and tooltip HTML — sigma's WebGL/Canvas2D pipelines cannot resolve CSS `var()` references, so these must be read at runtime via `getComputedStyle`
- **color.ts** contains hex colors for graph node/edge rendering — same constraint

### Padding
- **Outer cards**: All use `p-5` (1.25rem) — already consistent, maps to `--spacing-section`
- **Inner sub-panels**: Inconsistent — `p-3`, `p-3.5`, `p-4`, `px-3 py-2`, `px-4 py-3` etc.
- **Drawer scroll areas**: All use `px-6 py-6 md:px-7` — consistent
- **Drawer footer bars**: All use `px-6 py-5 md:px-7` — consistent

### Key Discoveries
- Sigma.js `floatColor()` only parses `#hex` and `rgb()/rgba()` strings — `var()` silently fails to black
- Canvas2D `fillStyle` also does not resolve CSS variables automatically
- The `--spacing-section` (1.25rem) and `--spacing-card` (1rem) tokens already exist in `@theme` but aren't used as Tailwind utilities yet

## Desired End State

- Zero hardcoded Tailwind palette colors in any `.tsx` file
- All UI colors come from semantic tokens that automatically adapt to light/dark mode
- Inner sub-panels use a consistent `p-card` (1rem) padding
- Outer cards use a consistent `p-section` (1.25rem) padding
- Graph canvas colors are read from CSS variables at runtime so they adapt to theme changes

### Verification
- `npx tsc --noEmit` passes with zero errors
- `grep -r "slate-\|blue-[0-9]\|red-[0-9]\|teal-\|amber-\|emerald-\|green-[0-9]" src/ --include="*.tsx"` returns zero matches
- Dark mode toggle works with no visual artifacts — all elements use semantic colors
- Card padding is visually uniform across all drawer sections

## What We're NOT Doing

- Not changing the graph visualization colors in `color.ts` TAG_COLORS array (these are data-visualization colors for node tagging, not UI theme colors)
- Not adding a full dark-mode-aware graph theme (sigma would need a re-render on theme change — future work)
- Not refactoring component structure or adding new components
- Not changing any functionality or business logic

## Implementation Approach

Bottom-up: CSS tokens first, then base UI components (Input/Select/TagInput), then feature components (drawer views/forms), then GraphCanvas last since it has special constraints.

---

## Phase 1: CSS Foundation

### Overview
Add `success` and `warning` semantic tokens. Verify padding utilities (`p-section`, `p-card`) work from existing `@theme` spacing values.

### Changes Required

#### 1. `src/index.css` — Add new tokens

Add to `:root`:
```css
--success: #34c759;
--success-foreground: #ffffff;
--warning: #ff9f0a;
--warning-foreground: #ffffff;
```

Add to `.dark`:
```css
--success: #30d158;
--success-foreground: #000000;
--warning: #ffd60a;
--warning-foreground: #000000;
```

Add to `@theme`:
```css
--color-success: var(--success);
--color-success-foreground: var(--success-foreground);
--color-warning: var(--warning);
--color-warning-foreground: var(--warning-foreground);
```

#### 2. `src/index.css` — Fix base border default

Change:
```css
border-color: var(--color-gray-200, currentColor);
```
To:
```css
border-color: var(--border);
```

### Success Criteria

#### Automated Verification:
- [ ] `npx tsc --noEmit` passes
- [ ] App loads without CSS errors in console
- [ ] `bg-success`, `text-warning`, `p-section`, `p-card` classes resolve in Tailwind

#### Manual Verification:
- [ ] No visual changes yet (additive only)

---

## Phase 2: Base UI Components

### Overview
Convert `Input`, `Select`, and `TagInput` — these are reused everywhere, so fixing them has cascading benefits.

### Changes Required

#### 1. `src/components/ui/Input.tsx`

**Color mapping:**
| Old | New |
|-----|-----|
| `text-slate-500` (label) | `text-muted-foreground` |
| `text-red-500` (required asterisk, error) | `text-destructive` |
| `border-slate-300` | `border-input` |
| `bg-white` | `bg-background` |
| `text-slate-900` | `text-foreground` |
| `placeholder:text-slate-400` | `placeholder:text-muted-foreground` |
| `focus:border-blue-400` | `focus:border-ring` |
| `focus:ring-blue-100` | `focus:ring-ring/20` |
| `border-red-300` (error border) | `border-destructive/50` |
| `focus:border-red-500` (error focus) | `focus:border-destructive` |
| `focus:ring-red-200` (error ring) | `focus:ring-destructive/20` |

#### 2. `src/components/ui/Select.tsx`

**Color mapping:**
| Old | New |
|-----|-----|
| `text-slate-500` (label) | `text-muted-foreground` |
| `text-red-500` (required) | `text-destructive` |
| `border-slate-300` (trigger) | `border-input` |
| `bg-white` (trigger) | `bg-background` |
| `text-slate-900` (trigger text) | `text-foreground` |
| `hover:bg-slate-50` (trigger hover) | `hover:bg-secondary` |
| `focus:border-blue-400` | `focus:border-ring` |
| `focus:ring-blue-100` | `focus:ring-ring/20` |
| `data-[placeholder]:text-slate-400` | `data-[placeholder]:text-muted-foreground` |
| `text-slate-400` (icon) | `text-muted-foreground` |
| `border-slate-200` (content) | `border-border` |
| `bg-white` (content) | `bg-background` |

#### 3. `src/components/ui/TagInput.tsx`

**Color mapping:**
| Old | New |
|-----|-----|
| `text-slate-500` (label) | `text-muted-foreground` |
| `border-slate-300` (wrapper) | `border-input` |
| `bg-white` (wrapper) | `bg-background` |
| `focus-within:border-blue-400` | `focus-within:border-ring` |
| `focus-within:ring-blue-100` | `focus-within:ring-ring/20` |
| `border-slate-200 bg-slate-50 text-slate-700` (tag badge) | `border-border bg-muted text-foreground` |
| `text-slate-400 hover:text-red-500` (remove btn) | `text-muted-foreground hover:text-destructive` |
| `text-slate-900` (input text) | `text-foreground` |
| `placeholder:text-slate-400` | `placeholder:text-muted-foreground` |
| `border-slate-200 bg-white` (dropdown) | `border-border bg-background` |
| `text-slate-700 hover:bg-slate-50` (dropdown item) | `text-foreground hover:bg-secondary` |
| `border-slate-300` (checkbox unselected) | `border-input` |
| `border-slate-400 text-slate-500` (create icon) | `border-muted-foreground text-muted-foreground` |

### Success Criteria

#### Automated Verification:
- [ ] `npx tsc --noEmit` passes
- [ ] `grep -r "slate-\|blue-[0-9]\|red-[0-9]" src/components/ui/ --include="*.tsx"` returns zero

#### Manual Verification:
- [ ] Input fields render correctly in light and dark mode
- [ ] Focus rings use primary/ring color
- [ ] Error states show destructive color
- [ ] Tag badges and dropdowns render with semantic colors

**Pause for manual verification before proceeding.**

---

## Phase 3: TopBar & GraphCanvas

### Overview
Convert the remaining hardcoded colors in TopBar (3 lines) and GraphCanvas UI elements (loading spinner, tooltip, canvas background). Sigma config hex colors will use `getComputedStyle` to read from CSS vars at runtime.

### Changes Required

#### 1. `src/components/TopBar.tsx`

| Line | Old | New |
|------|-----|-----|
| 31 | `text-slate-400` (search icon) | `text-muted-foreground` |
| 40 | `text-slate-700` / `placeholder:text-slate-400` (search input) | `text-foreground` / `placeholder:text-muted-foreground` |
| 45 | `text-slate-400 hover:text-slate-600` (clear btn) | `text-muted-foreground hover:text-foreground` |

#### 2. `src/graph/GraphCanvas.tsx`

**Tailwind class fixes:**
| Line | Old | New |
|------|-----|-----|
| 139 | `text-slate-400` | `text-muted-foreground` |
| 146 | `bg-slate-50` | `bg-secondary` |
| 150 | `border-slate-100 bg-white shadow-slate-200/50` | `border-border bg-background shadow-border/50` |

**Sigma config colors (lines 57-59):**
Read from CSS variables at runtime using a helper:
```ts
const style = getComputedStyle(document.documentElement)
const labelColor = style.getPropertyValue('--muted-foreground').trim() || '#86868b'
const nodeColor = style.getPropertyValue('--border').trim() || '#d2d2d7'
const edgeColor = style.getPropertyValue('--border').trim() || '#d2d2d7'
```
Then use in sigma config:
```ts
labelColor: { color: labelColor },
defaultNodeColor: nodeColor,
defaultEdgeColor: edgeColor,
```

**Tooltip HTML (lines 72-73):**
Same approach — read `--muted-foreground` and `--border` via `getComputedStyle` and interpolate into the HTML template string instead of hardcoded hex.

### Success Criteria

#### Automated Verification:
- [ ] `npx tsc --noEmit` passes
- [ ] `grep -r "slate-\|blue-[0-9]" src/components/TopBar.tsx src/graph/GraphCanvas.tsx` returns zero for Tailwind classes

#### Manual Verification:
- [ ] Search bar renders with semantic colors in both modes
- [ ] Graph canvas background adapts to theme
- [ ] Graph tooltip shows readable text in dark mode
- [ ] Loading spinner uses primary color

**Pause for manual verification before proceeding.**

---

## Phase 4: Drawer Components

### Overview
The largest phase — convert all 7 drawer component files. Apply consistent padding: outer cards get `p-section`, inner sub-panels get `p-card`.

### Universal Color Mapping (applies to all files below)

| Pattern | Old | New |
|---------|-----|-----|
| Card wrapper | `border-slate-200 bg-white` | `border-border bg-background` |
| Section heading | `text-slate-500` | `text-muted-foreground` |
| Body text (strong) | `text-slate-900` / `text-slate-700` | `text-foreground` |
| Body text (medium) | `text-slate-600` | `text-muted-foreground` |
| Body text (light) | `text-slate-400` | `text-muted-foreground/70` |
| Separator dot | `text-slate-300` | `text-border` |
| Sub-panel bg | `bg-slate-50` | `bg-muted` |
| Sub-panel border | `border-slate-200` | `border-border` |
| Native `<select>` inputs | `border-slate-300 bg-white text-slate-700 focus:border-blue-400 focus:ring-blue-100` | `border-input bg-background text-foreground focus:border-ring focus:ring-ring/20` |
| Textarea inputs | Same pattern as native selects | Same replacements |
| Delete/remove hover | `hover:border-red-200 hover:bg-red-50 hover:text-red-500` | `hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive` |
| Delete button text | `text-red-400` | `text-destructive/70` |
| Empty state | `border-dashed border-slate-300 bg-slate-50 text-slate-400` | `border-dashed border-border bg-muted text-muted-foreground` |
| Active/success state | `border-emerald-200 bg-emerald-50/60` / `border-teal-200 bg-teal-50/60` | `border-success/20 bg-success/10` |
| Warning state | `text-amber-600 hover:bg-amber-50` | `text-warning hover:bg-warning/10` |
| Strength badge strong | `bg-teal-50 text-teal-700 ring-1 ring-teal-200` | `bg-success/10 text-success ring-1 ring-success/20` |
| Strength badge growing | `bg-amber-50 text-amber-700 ring-1 ring-amber-200` | `bg-warning/10 text-warning ring-1 ring-warning/20` |
| Strength badge weak | `bg-slate-100 text-slate-600 ring-1 ring-slate-200` | `bg-muted text-muted-foreground ring-1 ring-border` |
| Strength bar track | `bg-slate-200` | `bg-border` |
| Info banner form | `border-blue-200 bg-blue-50/60` | `border-primary/20 bg-primary/10` |
| Back nav bar | `border-slate-200 bg-white` | `border-border bg-background` |
| Back nav text | `text-slate-500 hover:text-slate-700` | `text-muted-foreground hover:text-foreground` |

### Universal Padding Standardization

| Element Type | Old (varied) | New (standardized) |
|--------------|-------------|-------------------|
| Outer card `<section>` | `p-5` | `p-section` (same value, semantic name) |
| Inner sub-panel / form | `p-3` / `p-3.5` / `p-4` | `p-card` (1rem) |
| Inner row items | `px-3 py-2` / `px-4 py-3` / `px-4 py-2.5` | `p-card` (1rem) |
| Interaction feed item | `px-5 py-3.5` | `p-card` |
| Empty state panel | `px-4 py-8` / `px-3 py-5` | `px-card py-8` / `px-card py-section` |

### Files to Change

1. **`src/features/drawer/ContactDrawer.tsx`** — Already mostly clean. Only the `shadow-[0_16px_48px_rgba(0,0,0,0.12)]` needs review (acceptable as black shadow — works in both modes).

2. **`src/features/drawer/ContactView.tsx`** — Heaviest file. ~27 hardcoded color instances. Full rewrite of className strings.

3. **`src/features/drawer/ContactForm.tsx`** — ~18 hardcoded instances. Native `<select>` and `<textarea>` elements need conversion. All card sections need `p-section`.

4. **`src/features/drawer/InteractionForm.tsx`** — 6 instances. Back-nav bar, textarea, info banner.

5. **`src/features/drawer/InteractionFeed.tsx`** — 10 instances. Feed items and empty state.

6. **`src/features/drawer/BuilderSection.tsx`** — 11 instances. Active/ended builder rows, inline form.

7. **`src/features/drawer/PositionHistory.tsx`** — 11 instances. Current/past position rows, add form, work history card.

### Success Criteria

#### Automated Verification:
- [ ] `npx tsc --noEmit` passes
- [ ] `grep -r "slate-\|blue-[0-9]\|red-[0-9]\|teal-\|amber-\|emerald-" src/features/drawer/ src/components/ --include="*.tsx"` returns zero matches
- [ ] App builds: `npx vite build`

#### Manual Verification:
- [ ] All drawer views render correctly in light mode
- [ ] All drawer views render correctly in dark mode
- [ ] Card padding is visually uniform
- [ ] Inner panels have consistent spacing
- [ ] Strength badges show correct success/warning/muted colors
- [ ] Active builders show success styling
- [ ] Delete/remove buttons show destructive hover states
- [ ] Empty states are readable in both themes
- [ ] Form inputs (native selects, textareas) adapt to dark mode

**Pause for manual verification before proceeding.**

---

## Phase 5: Graph Runtime Colors (Optional Enhancement)

### Overview
Make sigma.js colors and tooltip HTML theme-aware by reading CSS variables at runtime. This is lower priority since the graph canvas is a WebGL/Canvas2D surface with different constraints.

### Changes Required

#### 1. `src/graph/GraphCanvas.tsx` — Read CSS vars for sigma config

At the top of the `useEffect` that creates the sigma instance, read theme colors:
```ts
const style = getComputedStyle(document.documentElement)
const resolveVar = (name: string, fallback: string) =>
  style.getPropertyValue(name).trim() || fallback

const themeColors = {
  label: resolveVar('--muted-foreground', '#86868b'),
  node: resolveVar('--border', '#d2d2d7'),
  edge: resolveVar('--border', '#d2d2d7'),
  tooltipMuted: resolveVar('--muted-foreground', '#86868b'),
  tooltipBorder: resolveVar('--border', '#d2d2d7'),
}
```

Use in sigma config and tooltip template.

#### 2. `src/utils/color.ts` — No changes

The `TAG_COLORS`, `YOU_NODE_COLOR`, `MUTUAL_EDGE_COLOR`, `DEFAULT_NODE_COLOR`, and strength colors are data-visualization constants fed into sigma's WebGL pipeline. They represent categorical data colors, not UI theme colors. Changing them would alter the graph's visual language, not its theme compliance. Leave as-is.

### Success Criteria

#### Automated Verification:
- [ ] `npx tsc --noEmit` passes

#### Manual Verification:
- [ ] Graph labels are readable in dark mode
- [ ] Graph tooltip text adapts to theme
- [ ] Node and edge default colors blend with dark background

---

## Testing Strategy

### Automated:
- TypeScript compilation: `npx tsc --noEmit`
- Build: `npx vite build`
- Grep audit: `grep -rn "slate-\|blue-[0-9]\|red-[0-9]\|teal-\|amber-\|emerald-\|green-[0-9]" src/ --include="*.tsx"` — must return empty

### Manual:
1. Toggle light → dark → system using TopBar theme button
2. Open Add Connection drawer — verify all form fields, labels, buttons
3. View a contact — verify strength bar, badges, referral banner, contact info cards
4. Open interaction form — verify textarea, back nav, footer
5. Check position history — verify current (success) and past (muted) states
6. Check builders — verify active (success) and ended (muted) states
7. Verify empty states render with muted styling

## Performance Considerations

- `getComputedStyle` calls in GraphCanvas are negligible (one-time read per sigma instantiation)
- No runtime overhead for Tailwind semantic classes — compiled identically to hardcoded palette classes
- No additional CSS bundle size — semantic utilities replace palette utilities 1:1

## References

- Semantic token source: `../kratos-store/app/globals.css`
- Current theme: `src/index.css`
- Tailwind v4 @theme docs: theme tokens auto-generate utilities
