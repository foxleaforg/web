"use client";

import { useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** What each score means, announced to screen readers and shown on hover. */
const SCORE_WORDS: Record<number, string> = {
  1: "Awful",
  2: "Bad",
  3: "Poor",
  4: "Meh",
  5: "Okay",
  6: "Decent",
  7: "Good",
  8: "Great",
  9: "Excellent",
  10: "Perfect",
};

/**
 * Foxleaf's 1–10 rating. A radiogroup, implemented the way the ARIA pattern
 * actually specifies:
 *
 * - Roving tabindex. One Tab stop for the whole group, not ten. Arrow keys
 *   move between scores, Home/End jump to the ends.
 * - Arrow keys both move focus AND commit the rating, which is the expected
 *   radio behaviour.
 * - Each radio is named "8 out of 10, Great" rather than a bare digit.
 *
 * ## Why `saving` is not `disabled`
 *
 * Saving a rating must NOT set the HTML `disabled` attribute on these
 * buttons. Disabling the element that currently has focus makes the browser
 * blur it — focus drops to `<body>` and is not restored when the attribute is
 * removed. Since every arrow key commits, a ~25ms save window was enough to
 * destroy focus after the first interaction, so arrow keys appeared dead.
 *
 * `saving` therefore only sets `aria-busy`; the controls stay focusable and
 * operable. The `disabled` prop remains for genuine disablement (logged out,
 * read-only), where losing focus is correct.
 */
export function RatingInput({
  currentRating,
  onRate,
  disabled = false,
  saving = false,
}: {
  currentRating: number | null;
  onRate: (score: number) => void;
  /** Genuine disablement only — never pass a transient save flag here. */
  disabled?: boolean;
  /** A save is in flight. Marks the group busy without blocking input. */
  saving?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  // Optimistic selection. The parent only learns the new rating once the
  // network round-trip finishes, which would otherwise leave `aria-checked`
  // lagging a keypress behind the visible focus.
  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const [lastPropRating, setLastPropRating] = useState(currentRating);
  if (lastPropRating !== currentRating) {
    // The parent caught up (or corrected us after a failure) — defer to it.
    setLastPropRating(currentRating);
    setPendingScore(null);
  }

  const selected = pendingScore ?? currentRating;
  const active = hover ?? selected ?? 0;
  // With nothing chosen yet, the first score is the group's Tab stop.
  const tabStop = selected ?? 1;
  const preview = hover ?? selected;

  function commit(score: number) {
    setPendingScore(score);
    onRate(score);
  }

  function move(to: number) {
    const clamped = Math.min(10, Math.max(1, to));
    refs.current[clamped - 1]?.focus();
    commit(clamped);
  }

  function handleKeyDown(event: React.KeyboardEvent, score: number) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(score === 10 ? 1 : score + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(score === 1 ? 10 : score - 1);
        break;
      case "Home":
        event.preventDefault();
        move(1);
        break;
      case "End":
        event.preventDefault();
        move(10);
        break;
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="radiogroup"
        aria-label="Rate this book from 1 to 10"
        aria-busy={saving || undefined}
        onMouseLeave={() => setHover(null)}
        // Two rows of five on narrow screens (chunky, thumb-friendly), one
        // row of ten once there is room. A plain flex-wrap row broke into an
        // uneven 8 + 2 at the width of the panel this sits in.
        className="grid max-w-md grid-cols-5 gap-2 sm:grid-cols-10 sm:gap-1.5"
      >
        {SCORES.map((score, i) => {
          const filled = score <= active;
          const isCurrent = selected === score;
          return (
            <button
              key={score}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isCurrent}
              aria-label={`${score} out of 10, ${SCORE_WORDS[score]}`}
              tabIndex={score === tabStop ? 0 : -1}
              disabled={disabled}
              onMouseEnter={() => setHover(score)}
              onFocus={() => setHover(score)}
              onBlur={() => setHover(null)}
              onKeyDown={(e) => handleKeyDown(e, score)}
              onClick={() => commit(score)}
              className={cn(
                "text-small tap-target h-10 w-full rounded-control font-semibold",
                "border transition-[background-color,border-color,transform,color]",
                "duration-150 ease-out",
                "hover:-translate-y-0.5 motion-reduce:transform-none",
                "disabled:cursor-not-allowed disabled:opacity-60",
                "disabled:hover:translate-y-0",
                filled
                  ? "border-foxleaf-primary bg-foxleaf-primary text-foxleaf-primary-fg"
                  : "border-foxleaf-border-strong bg-foxleaf-surface text-foxleaf-muted hover:border-foxleaf-primary hover:text-foxleaf-primary",
                // The chosen score keeps a ring so it stays identifiable
                // while hovering over a different number.
                isCurrent &&
                  "ring-2 ring-foxleaf-primary-active ring-offset-1 ring-offset-foxleaf-surface",
              )}
            >
              {score}
            </button>
          );
        })}
      </div>

      {/* Reserve the line so the panel doesn't jump as the word changes. */}
      <p className="text-small min-h-5 text-foxleaf-muted">
        {preview ? (
          <span>
            <span className="font-semibold text-foxleaf-ink">{preview}</span>
            <span aria-hidden>/10</span>{" "}
            <span className="text-foxleaf-primary">
              {SCORE_WORDS[preview]}
            </span>
          </span>
        ) : (
          "Pick a number to rate this book."
        )}
      </p>
    </div>
  );
}
