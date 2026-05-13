"use client";

import { useState } from "react";

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function RatingInput({
  currentRating,
  onRate,
  disabled = false,
}: {
  currentRating: number | null;
  onRate: (score: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? currentRating ?? 0;

  return (
    <div
      className="inline-flex items-center gap-1.5"
      onMouseLeave={() => setHover(null)}
      role="radiogroup"
      aria-label="Rate this book from 1 to 10"
    >
      {SCORES.map((score) => {
        const filled = score <= active;
        const isCurrent = currentRating === score;
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={isCurrent}
            aria-label={`${score} out of 10`}
            disabled={disabled}
            onMouseEnter={() => setHover(score)}
            onFocus={() => setHover(score)}
            onBlur={() => setHover(null)}
            onClick={() => onRate(score)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-inset transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
              filled
                ? "bg-amber-400 text-stone-900 ring-amber-500/30 shadow-sm"
                : "bg-white/60 text-stone-400 ring-stone-200 hover:bg-amber-50 hover:text-stone-700"
            } ${isCurrent ? "scale-105 ring-amber-600/50" : ""}`}
          >
            {score}
          </button>
        );
      })}
    </div>
  );
}
