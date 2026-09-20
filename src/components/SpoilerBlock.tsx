"use client";

import { useId, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

export type SpoilerSeverity = "minor" | "major" | "ending";

/**
 * Severity is signalled four ways, only one of which is colour: the text
 * label, the icon shape, the number of filled severity pips, and the tint.
 * A reader who cannot distinguish the amber and red tints can still tell a
 * "Major" spoiler from an "Ending" spoiler at a glance.
 */
type SeverityStyle = {
  label: string;
  /** How serious, 1–3. Drawn as filled pips. */
  level: 1 | 2 | 3;
  conceal: string;
  reveal: string;
  icon: ReactNode;
};

const IconEye = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
);

const IconTriangle = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M8 2.5 15 13.5H1L8 2.5Z" strokeLinejoin="round" />
    <path d="M8 6.8v2.6" strokeLinecap="round" />
    <circle cx="8" cy="11.4" r="0.85" fill="currentColor" stroke="none" />
  </svg>
);

const IconOctagon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path
      d="M5.4 1.8h5.2l3.6 3.6v5.2l-3.6 3.6H5.4L1.8 10.6V5.4L5.4 1.8Z"
      strokeLinejoin="round"
    />
    <path d="M8 5v3.6" strokeLinecap="round" />
    <circle cx="8" cy="10.9" r="0.85" fill="currentColor" stroke="none" />
  </svg>
);

const SEVERITY_STYLES: Record<SpoilerSeverity, SeverityStyle> = {
  minor: {
    label: "Minor spoiler",
    level: 1,
    conceal:
      "border-foxleaf-spoiler-minor-border bg-foxleaf-spoiler-minor " +
      "text-foxleaf-spoiler-minor-fg hover:brightness-97",
    reveal:
      "border-foxleaf-spoiler-minor-border bg-foxleaf-spoiler-minor/50",
    icon: IconEye,
  },
  major: {
    label: "Major spoiler",
    level: 2,
    conceal:
      "border-foxleaf-spoiler-major-border bg-foxleaf-spoiler-major " +
      "text-foxleaf-spoiler-major-fg hover:brightness-97",
    reveal:
      "border-foxleaf-spoiler-major-border bg-foxleaf-spoiler-major/50",
    icon: IconTriangle,
  },
  ending: {
    label: "Ending spoiler",
    level: 3,
    conceal:
      "border-foxleaf-spoiler-ending-border bg-foxleaf-spoiler-ending " +
      "text-foxleaf-spoiler-ending-fg hover:brightness-97",
    reveal:
      "border-foxleaf-spoiler-ending-border bg-foxleaf-spoiler-ending/50",
    icon: IconOctagon,
  },
};

/** Three pips, `level` of them filled. Redundant with the label and icon. */
function SeverityPips({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={
            "size-1.5 rounded-full border border-current " +
            (i <= level ? "bg-current" : "opacity-40")
          }
        />
      ))}
    </span>
  );
}

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
  const panelId = useId();

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
      <div className={`my-2 rounded-card border px-4 py-3 ${style.reveal}`}>
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-caption font-medium tracking-wide text-foxleaf-muted uppercase">
            <span aria-hidden className="[&>svg]:size-4">
              {style.icon}
            </span>
            {style.label}
            <SeverityPips level={style.level} />
          </span>
          <button
            type="button"
            onClick={() => setRevealed(false)}
            aria-expanded
            aria-controls={panelId}
            className="tap-target rounded-full px-2 py-0.5 text-caption font-medium text-foxleaf-muted transition-colors hover:bg-foxleaf-surface hover:text-foxleaf-ink"
          >
            Hide<span className="sr-only"> {style.label.toLowerCase()}</span>
          </button>
        </div>
        <p
          id={panelId}
          className="text-small whitespace-pre-wrap text-foxleaf-ink"
        >
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
        aria-expanded={false}
        aria-controls={panelId}
        className={`group tap-target flex w-full items-center justify-between gap-3 rounded-card border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${style.conceal}`}
      >
        <span className="text-small inline-flex items-center gap-2 font-medium">
          <span aria-hidden className="[&>svg]:size-4">
            {style.icon}
          </span>
          {style.label}
          <SeverityPips level={style.level} />
        </span>
        <span className="text-caption opacity-80">
          {loading ? "Revealing…" : "Reveal"}
        </span>
      </button>
      {error ? (
        <p
          className="text-caption mt-1 flex items-center gap-1.5 text-foxleaf-danger"
          role="alert"
        >
          <span aria-hidden>▲</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
