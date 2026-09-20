# Accessibility at Foxleaf

Foxleaf exists to make reading feel welcoming to everyone. A reading community
that some readers cannot use is not doing its job. Accessibility is a
requirement here, on the same footing as "it compiles" — not a later pass.

This document is the standard. If you are adding a component or a page, it
applies to you.

## What we commit to

**WCAG 2.1 Level AA**, plus a few things above it where they are cheap and
matter (44×44 touch targets, `prefers-reduced-motion`).

Concretely:

- Everything works with a keyboard alone.
- Everything works with a screen reader.
- Nothing is communicated by colour alone.
- Nothing moves if the reader asked the OS to reduce motion.
- Text meets 4.5:1 contrast; large text and UI boundaries meet 3:1.

## Colour and contrast

All colour lives in `--fox-*` custom properties in `src/app/globals.css`. Do
not hardcode a colour in a component.

Run the audit after touching any colour token:

```bash
npm run check:contrast
```

It parses the tokens straight out of `globals.css`, checks every pairing the
UI actually renders in both light and dark themes, and exits non-zero on
failure. If you add a pairing the UI renders, add it to the `PAIRS` list in
`scripts/check-contrast.mjs`.

Token rules worth knowing:

| Token | Use for | Never use for |
| --- | --- | --- |
| `foxleaf-ink` | body text | — |
| `foxleaf-muted` | secondary text | — |
| `foxleaf-subtle` | decorative marks, dividers | **any text** (3.1:1) |
| `foxleaf-placeholder` | input placeholders | — |
| `foxleaf-primary` | brand fills, and terracotta **as text** | — |
| `foxleaf-primary-bright` | illustration, the fox | **any text** |
| `foxleaf-border` | decorative card edges, dividers | control borders |
| `foxleaf-border-strong` | input/control borders (3:1) | — |

Filled controls have a paired foreground token (`primary-fg`, `accent-fg`).
Use it rather than `text-white` — in dark mode terracotta lightens and the
correct foreground flips to dark ink.

## Not colour alone (WCAG 1.4.1)

Any state that matters must be readable in greyscale. In practice: pair the
colour with a **text label** and a **distinct shape**.

- Reading statuses (`StatusBadge`) each have a unique icon silhouette. Adding
  a status means designing a new silhouette, not picking a new colour.
- Spoiler severities (`SpoilerBlock`) carry a label, an icon shape, and a
  count of filled pips.
- Form errors carry an icon and a message, not just a red border.

The `/design` page renders the statuses and spoilers a second time under a
`grayscale` filter. Look at it.

## Keyboard

- Every interactive thing is a real `<button>`, `<a>`, `<input>` or `<select>`.
  A `<div>` with an `onClick` is a bug.
- Do not remove focus outlines. The global `:focus-visible` style in
  `globals.css` is the house style; if you must override it, the replacement
  must be at least as visible and still meet 3:1.
- Clickable cards use the stretched-link pattern, not a click handler on the
  card. See the doc comment on `Card`.
- A skip link is the first focusable element on every page (in `layout.tsx`).

## Screen readers

- Every input has a real `<label>` tied by `htmlFor`/`id`. `Input` and
  `Textarea` do this for you; do not hand-roll form fields.
- Errors are linked with `aria-describedby` and the field gets `aria-invalid`.
- Decorative images, emoji and icons get `aria-hidden`. Meaningful ones get a
  text alternative. The `Fox` component takes `decorative` for the first case
  and `label` for the second.
- Icon-only buttons need `aria-label`.
- Abbreviations that a screen reader would mangle get a spoken form — see how
  `StatusBadge` handles "DNF".
- Landmarks: one `<h1>` per page, one `<main>`, `<nav>` labelled when there
  could be more than one.

## Target size

Interactive elements get a hit area of at least 44×44px. Where the visual
design is smaller, use the `tap-target` utility, which grows the hit area with
a centred pseudo-element without changing how the control looks.

This does not work on `<input>` and other replaced elements, which do not
support pseudo-elements. Size those directly. `Input` at `md` and `lg` meets
44px; `sm` is 40px and is for dense desktop UI only.

## Motion

`globals.css` collapses animations and transitions under
`@media (prefers-reduced-motion: reduce)`. Durations go to ~0 rather than
`none` so any code awaiting a transition-end event still fires.

Do not add motion that bypasses this — no inline `style={{ transition }}`, no
JS-driven animation without a `matchMedia('(prefers-reduced-motion: reduce)')`
check.

## Before you open a PR

- [ ] `npm run check:contrast` passes
- [ ] Tab through the change. Can you reach and operate everything? Can you
      see where focus is at every step?
- [ ] Screenshot it in greyscale. Is any state now ambiguous?
- [ ] Any new state conveyed by colour also has a label or a shape
- [ ] New inputs have labels; new icon-only buttons have `aria-label`
- [ ] New decorative art is `aria-hidden`

## Known gaps

Tracked honestly rather than quietly:

- `Input` at `size="sm"` is 40px tall, under the 44px target we aim for. It
  clears the WCAG 2.2 AA minimum of 24px.
- Automated axe/Lighthouse checks are not wired into CI yet; only the contrast
  audit is scripted.
- The navbar has no mobile menu. Below ~640px the links scroll sideways, which
  is reachable but not discoverable. Needs a real menu.
- `StatusDropdown` is a menu of buttons with no arrow-key navigation. Tab
  works; a full menu pattern (or a native `<select>`) would be better.
- Done so far: landing, search, book detail. Still to do: shelves, profile,
  import, login, register, the review editor.
