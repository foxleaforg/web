#!/usr/bin/env node
/**
 * WCAG 2.1 contrast audit for the Foxleaf design tokens.
 *
 * Parses the `--fox-*` custom properties straight out of src/app/globals.css
 * (light block and dark block separately) and checks every pairing the design
 * system actually renders. Run it after touching any colour token:
 *
 *   node scripts/check-contrast.mjs
 *
 * Exits non-zero if any required pairing fails, so it can gate CI.
 *
 * Thresholds (WCAG 2.1 AA):
 *   text  4.5:1  — body text, button labels, anything under 18px / 14px bold
 *   large 3.0:1  — 18px+ normal or 14px+ bold
 *   ui    3.0:1  — component boundaries, focus rings, meaningful graphics (1.4.11)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS_PATH = resolve(HERE, "../src/app/globals.css");

/* ---------------------------------------------------------------- parsing */

// Anchored to the start of a line: the file's header comment contains the
// literal text ":root { --fox-* }", which a plain indexOf would match first.
function blockAfter(text, selectorRe, label) {
  const match = selectorRe.exec(text);
  if (!match) throw new Error(`Could not find ${label} block in globals.css`);
  const start = match.index;
  let i = text.indexOf("{", start);
  let depth = 0;
  const from = i + 1;
  for (; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(from, i);
    }
  }
  throw new Error(`Unbalanced braces in ${label} block`);
}

function parseTokens(block) {
  const tokens = {};
  const re = /(--fox-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let m;
  while ((m = re.exec(block))) tokens[m[1]] = m[2].toLowerCase();
  return tokens;
}

/* ---------------------------------------------------------------- contrast */

function toRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function relativeLuminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const THRESHOLDS = { text: 4.5, large: 3, ui: 3 };

/**
 * Every pairing the UI actually renders. `fg` and `bg` are token names minus
 * the `--fox-` prefix. Keep this in step with the components.
 */
const PAIRS = [
  // --- Body text on every surface it can sit on ---------------------------
  ["ink", "cream", "text", "Body text on app background"],
  ["ink", "surface", "text", "Body text on cards"],
  ["ink", "cream-deep", "text", "Body text on inset wells / ghost hover"],
  ["ink", "surface-muted", "text", "Body text on nested panels"],

  ["text-muted", "cream", "text", "Secondary text on app background"],
  ["text-muted", "surface", "text", "Secondary text on cards"],
  ["text-muted", "cream-deep", "text", "Secondary text on inset wells"],
  ["text-muted", "surface-muted", "text", "Secondary text on nested panels"],

  // --- Brand colour used AS text ------------------------------------------
  ["primary", "cream", "text", "Terracotta text/links on app background"],
  ["primary", "surface", "text", "Terracotta text/links on cards"],
  ["primary", "cream-deep", "text", "Outline button label on hover"],
  ["accent", "cream", "text", "Forest green text on app background"],
  ["accent", "surface", "text", "Forest green text on cards"],
  ["danger", "cream", "text", "Form error message on app background"],
  ["danger", "surface", "text", "Form error message on cards"],

  // --- Filled controls ----------------------------------------------------
  ["primary-fg", "primary", "text", "Primary button label"],
  ["primary-fg", "primary-hover", "text", "Primary button label, hovered"],
  ["primary-fg", "primary-active", "text", "Primary button label, pressed"],
  ["accent-fg", "accent", "text", "Secondary button label"],
  ["accent-fg", "accent-hover", "text", "Secondary button label, hovered"],
  ["accent-fg", "accent-active", "text", "Secondary button label, pressed"],

  // --- Badges / tinted pills ----------------------------------------------
  ["primary-tint-fg", "primary-tint", "text", "Badge: primary"],
  ["accent-tint-fg", "accent-tint", "text", "Badge: green"],
  ["success-tint-fg", "success-tint", "text", "Badge: success"],
  ["warning-tint-fg", "warning-tint", "text", "Badge: amber / DNF"],
  ["danger-tint-fg", "danger-tint", "text", "Badge: red"],
  ["neutral-tint-fg", "neutral-tint", "text", "Badge: gray"],

  // --- Spoiler severities --------------------------------------------------
  ["spoiler-minor-fg", "spoiler-minor", "text", "Spoiler: minor"],
  ["spoiler-major-fg", "spoiler-major", "text", "Spoiler: major"],
  ["spoiler-ending-fg", "spoiler-ending", "text", "Spoiler: ending"],

  // --- Non-text contrast (WCAG 1.4.11, 3:1) --------------------------------
  ["border-strong", "cream", "ui", "Input/outline border on app background"],
  ["border-strong", "surface", "ui", "Input/outline border on cards"],
  // The focus ring is drawn with `outline-offset: 2px`, so the colour
  // adjacent to it is always the page/card background it floats over — never
  // the button fill underneath. These two are the pairings that matter.
  ["ring", "cream", "ui", "Focus ring against app background"],
  ["ring", "surface", "ui", "Focus ring against cards"],
  ["primary", "cream", "ui", "Primary button body against app background"],
  ["accent", "cream", "ui", "Secondary button body against app background"],
  ["placeholder", "surface", "text", "Input placeholder text"],

  // --- Cover placeholders: title text is typeset on the gradient -----------
  ["cover-fg", "cover-1-from", "text", "Cover title: terracotta, light stop"],
  ["cover-fg", "cover-1-to", "text", "Cover title: terracotta, dark stop"],
  ["cover-fg", "cover-2-from", "text", "Cover title: forest, light stop"],
  ["cover-fg", "cover-2-to", "text", "Cover title: forest, dark stop"],
  ["cover-fg", "cover-3-from", "text", "Cover title: wine, light stop"],
  ["cover-fg", "cover-3-to", "text", "Cover title: wine, dark stop"],
  ["cover-fg", "cover-4-from", "text", "Cover title: ochre, light stop"],
  ["cover-fg", "cover-4-to", "text", "Cover title: ochre, dark stop"],

  // --- Badge status dots (meaningful graphics) -----------------------------
  ["primary", "primary-tint", "ui", "Status dot: primary"],
  ["accent", "accent-tint", "ui", "Status dot: green"],
  ["warning", "warning-tint", "ui", "Status dot: amber"],
  ["danger", "danger-tint", "ui", "Status dot: red"],
  ["text-muted", "neutral-tint", "ui", "Status dot: gray"],
];

/**
 * Pairings that are allowed to fail, with the reason. `subtle` is decorative
 * only — it must never carry information. Asserted here so that if anyone
 * uses it for real text, the audit still tells the truth about it.
 */
const ADVISORY = new Set([
  "text-subtle|cream",
  "text-subtle|surface",
  "border|cream",
  "border|surface",
  "surface|cream",
]);

const ADVISORY_PAIRS = [
  ["text-subtle", "cream", "text", "Decorative-only subtle text (ADVISORY)"],
  ["text-subtle", "surface", "text", "Decorative-only subtle text (ADVISORY)"],
  // `border` is the soft decorative edge on cards and dividers. It carries no
  // information (a card is not a control), so 1.4.11 does not apply. Controls
  // use `border-strong`, which is checked as a hard requirement above.
  ["border", "cream", "ui", "Decorative card/divider edge (ADVISORY)"],
  ["border", "surface", "ui", "Decorative card/divider edge (ADVISORY)"],
  ["surface", "cream", "ui", "Card fill vs page background (ADVISORY)"],
];

/* ------------------------------------------------------------------- run */

const css = readFileSync(CSS_PATH, "utf8");
const lightTokens = parseTokens(blockAfter(css, /^:root \{/m, "light (:root)"));
const darkOverrides = parseTokens(
  blockAfter(css, /^\[data-theme="dark"\] \{/m, 'dark ([data-theme="dark"])'),
);

const themes = {
  light: lightTokens,
  // The dark block overrides `:root`, it does not replace it — a token the
  // dark block never mentions (cover gradients, mascot fur) still resolves to
  // its `:root` value. Merging mirrors what the browser actually computes.
  dark: { ...lightTokens, ...darkOverrides },
};

// Guard against the parser silently matching the wrong thing again.
for (const [name, tokens] of Object.entries(themes)) {
  const count = Object.keys(tokens).length;
  if (count < 30) {
    console.error(
      `Parsed only ${count} tokens from the ${name} block — parser is broken.`,
    );
    process.exit(2);
  }
}

let failures = 0;
let advisories = 0;

for (const [themeName, tokens] of Object.entries(themes)) {
  console.log(`\n\x1b[1m${themeName.toUpperCase()}\x1b[0m`);
  console.log("─".repeat(88));

  for (const [fg, bg, kind, label] of [...PAIRS, ...ADVISORY_PAIRS]) {
    const fgHex = tokens[`--fox-${fg}`];
    const bgHex = tokens[`--fox-${bg}`];
    if (!fgHex || !bgHex) {
      console.log(`\x1b[31m  MISSING TOKEN\x1b[0m ${fg} on ${bg}`);
      failures++;
      continue;
    }

    const ratio = contrast(fgHex, bgHex);
    const need = THRESHOLDS[kind];
    const pass = ratio >= need;
    const advisory = ADVISORY.has(`${fg}|${bg}`);

    if (!pass && advisory) advisories++;
    else if (!pass) failures++;

    const mark = pass
      ? "\x1b[32mPASS\x1b[0m"
      : advisory
        ? "\x1b[33mNOTE\x1b[0m"
        : "\x1b[31mFAIL\x1b[0m";

    console.log(
      `  ${mark} ${ratio.toFixed(2).padStart(5)}:1 (need ${need})  ` +
        `${label}\n       ${fg} ${fgHex} on ${bg} ${bgHex}`,
    );
  }
}

console.log("\n" + "─".repeat(88));
if (failures) {
  console.log(`\x1b[31m${failures} failing pairing(s).\x1b[0m`);
} else {
  console.log(`\x1b[32mAll required pairings pass WCAG AA.\x1b[0m`);
}
if (advisories) {
  console.log(`${advisories} advisory note(s) — decorative tokens, not errors.`);
}

process.exit(failures ? 1 : 0);
