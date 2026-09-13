"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

export type SpoilerSeverity = "minor" | "major" | "ending";

type SeverityStyle = {
  label: string;
  conceal: string;
  reveal: string;
  icon: string;
};

const SEVERITY_STYLES: Record<SpoilerSeverity, SeverityStyle> = {
  minor: {
    label: "Minor spoiler",
    conceal:
      "border-stone-300 bg-stone-100 text-stone-700 hover:bg-stone-200",
    reveal: "border-stone-200 bg-stone-50",
    icon: "👀",
  },
  major: {
    label: "Major spoiler",
    conceal:
      "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200",
    reveal: "border-amber-200 bg-amber-50",
    icon: "⚠️",
  },
  ending: {
    label: "Ending spoiler",
    conceal:
      "border-red-300 bg-red-100 text-red-900 hover:bg-red-200",
    reveal: "border-red-200 bg-red-50",
    icon: "🚨",
  },
};

export function SpoilerBlock({
  spoilerBlockId,
  severity,
}: {
  spoilerBlockId: string;
  severity: SpoilerSeverity;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.major;

  async function handleReveal() {
    if (!isLoggedIn()) {
      setError("Log in to reveal spoilers.");
      return;
    }
    setError(null);
    if (content !== null) {
      setRevealed(true);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<{ content: string }>(
        `/reviews/spoiler/${spoilerBlockId}/reveal`,
      );
      setContent(data.content);
      setRevealed(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't reveal spoiler.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (revealed && content !== null) {
    return (
      <div
        className={`my-2 rounded-xl border px-4 py-3 ${style.reveal}`}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">
            <span aria-hidden>{style.icon}</span>
            {style.label}
          </span>
          <button
            type="button"
            onClick={() => setRevealed(false)}
            className="rounded-full px-2 py-0.5 text-xs font-medium text-stone-600 hover:bg-white/60 hover:text-stone-900"
          >
            Hide
          </button>
        </div>
        <p className="whitespace-pre-wrap text-sm text-stone-800">
          {content}
        </p>
      </div>
    );
  }

  return (
    <div className="my-2">
      <button
        type="button"
        onClick={handleReveal}
        disabled={loading}
        className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${style.conceal}`}
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <span aria-hidden className="text-base">
            {style.icon}
          </span>
          {style.label} — click to reveal
        </span>
        <span className="text-xs text-stone-600 transition-colors group-hover:text-stone-900">
          {loading ? "Revealing…" : "Reveal"}
        </span>
      </button>
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
