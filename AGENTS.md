<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Accessibility is a requirement, not a pass at the end

Read [`ACCESSIBILITY.md`](./ACCESSIBILITY.md) before building any component or
page. Foxleaf targets **WCAG 2.1 AA**, and new work is expected to meet it as
written, not to be retrofitted later.

The rules that get broken most often:

- Colour comes from `--fox-*` tokens in `src/app/globals.css`. Never hardcode
  a hex or a stock Tailwind colour (`text-stone-700`, `bg-amber-50`, …) in a
  component.
- Run `npm run check:contrast` after touching any colour token. It fails the
  build on any pairing below AA.
- No state may be communicated by colour alone — pair it with a text label
  and a distinct shape.
- Interactive elements are real `<button>` / `<a>` / `<input>`. A `<div>` with
  an `onClick` is a bug. Clickable cards use the `stretch-link` pattern.
- Never remove a focus outline without an equally visible replacement.
- Decorative art gets `aria-hidden`; meaningful art gets a text alternative.

## Design system

Tokens, type scale and primitives live in `src/app/globals.css` and
`src/components/ui/`. `/design` renders every token and component, including
greyscale checks for the colour-independent states. Prefer extending a
primitive over writing a one-off.
