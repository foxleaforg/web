import type { ReactNode, SVGProps } from "react";
import { cn } from "./ui/cn";

/**
 * The Foxleaf mascot.
 *
 * The artwork is inline SVG drawn from the mascot tokens in globals.css
 * (`--fox-mascot-*`), so the fox stays fox-coloured in any theme. All of it
 * lives in `FOX_ART` below: to swap in real illustrations later, replace the
 * entries in that record with `<Image …>` (or whatever you land on) and every
 * call site keeps working unchanged.
 */

export type FoxMood =
  | "reading"
  | "celebrating"
  | "empty"
  | "sleeping"
  | "searching";

export type FoxSize = "sm" | "md" | "lg";

const SIZES: Record<FoxSize, string> = {
  sm: "w-16",
  md: "w-24",
  lg: "w-36",
};

/** Fallback alt text. Override per-use with the `label` prop. */
const MOOD_LABELS: Record<FoxMood, string> = {
  reading: "A fox reading a book",
  celebrating: "A fox celebrating",
  empty: "A fox looking at an empty space",
  sleeping: "A sleeping fox",
  searching: "A fox searching with a magnifying glass",
};

export type FoxProps = {
  mood?: FoxMood;
  size?: FoxSize;
  /** Optional caption rendered below the fox. */
  message?: ReactNode;
  /** Accessible name for the artwork. Defaults to a description of the mood. */
  label?: string;
  /**
   * Hides the fox from assistive tech. Use when adjacent text already says
   * what the fox is saying — announcing it again is noise, not information.
   * Implied when `message` is set, since the message carries the meaning.
   */
  decorative?: boolean;
  className?: string;
};

export function Fox({
  mood = "empty",
  size = "md",
  message,
  label,
  decorative = false,
  className,
}: FoxProps) {
  const Art = FOX_ART[mood];
  const hidden = decorative || Boolean(message);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 text-center",
        className,
      )}
    >
      <Art
        className={cn(SIZES[size], "h-auto")}
        {...(hidden
          ? { "aria-hidden": true }
          : { role: "img", "aria-label": label ?? MOOD_LABELS[mood] })}
      />
      {message ? (
        <p className="max-w-xs text-small text-foxleaf-muted text-balance">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/* ==========================================================================
   Artwork
   ========================================================================== */

type ArtProps = SVGProps<SVGSVGElement>;

const FUR = "var(--fox-mascot-fur)";
const FUR_DEEP = "var(--fox-mascot-fur-deep)";
const BELLY = "var(--fox-mascot-belly)";
const INK = "var(--fox-mascot-ink)";

function FoxCanvas({ children, ...props }: ArtProps) {
  return (
    <svg viewBox="0 0 120 116" fill="none" {...props}>
      {children}
    </svg>
  );
}

type EyeStyle = "open" | "happy" | "closed" | "squint" | "lowered" | "soft";

/** The head, in its own 96×96 coordinate space, offset onto the canvas. */
function FoxHead({ eyes }: { eyes: EyeStyle }) {
  return (
    <g transform="translate(12 14)">
      {/* Ears, behind the head */}
      <path d="M13 36 L20 6 L43 23 Z" fill={FUR_DEEP} />
      <path d="M83 36 L76 6 L53 23 Z" fill={FUR_DEEP} />
      <path d="M20.5 32 L24 15 L36.5 24.5 Z" fill={BELLY} opacity="0.85" />
      <path d="M75.5 32 L72 15 L59.5 24.5 Z" fill={BELLY} opacity="0.85" />

      {/* Head */}
      <path
        d="M14 38 C14 18 82 18 82 38 C82 58 70 70 48 84 C26 70 14 58 14 38 Z"
        fill={FUR}
      />

      {/* Muzzle */}
      <path
        d="M48 84 C34 74 26 64 26 54 C34 49.5 62 49.5 70 54 C70 64 62 74 48 84 Z"
        fill={BELLY}
      />

      {/* Cheeks */}
      <ellipse cx="23" cy="57" rx="5" ry="3.2" fill={FUR_DEEP} opacity="0.3" />
      <ellipse cx="73" cy="57" rx="5" ry="3.2" fill={FUR_DEEP} opacity="0.3" />

      <Eyes style={eyes} />

      {/* Nose and smile */}
      <path d="M48 67.5 L41.8 59.5 Q48 56.8 54.2 59.5 Z" fill={INK} />
      <path
        d="M48 67.5 V71 M48 71 Q43.5 74.5 39.8 71.5 M48 71 Q52.5 74.5 56.2 71.5"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

function Eyes({ style }: { style: EyeStyle }) {
  const arc = {
    stroke: INK,
    strokeWidth: 4,
    strokeLinecap: "round" as const,
    fill: "none",
  };

  switch (style) {
    case "happy":
      return (
        <g {...arc}>
          <path d="M27.5 49 Q33 42.5 38.5 49" />
          <path d="M57.5 49 Q63 42.5 68.5 49" />
        </g>
      );

    case "closed":
      return (
        <g {...arc}>
          <path d="M27.5 45.5 Q33 51.5 38.5 45.5" />
          <path d="M57.5 45.5 Q63 51.5 68.5 45.5" />
        </g>
      );

    case "squint":
      return (
        <g {...arc}>
          <path d="M28.5 47 H37.5" />
          <path d="M58.5 47 H67.5" />
        </g>
      );

    case "lowered":
      return (
        <g>
          <circle cx="33" cy="49" r="4" fill={INK} />
          <circle cx="63" cy="49" r="4" fill={INK} />
          <path
            d="M28.5 44 Q33 42 37.5 44 M58.5 44 Q63 42 67.5 44"
            stroke={INK}
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );

    case "soft":
      return (
        <g>
          <circle cx="33" cy="47.5" r="4.2" fill={INK} />
          <circle cx="63" cy="47.5" r="4.2" fill={INK} />
          <path
            d="M28 42.5 Q33 40 38 42.5 M58 42.5 Q63 40 68 42.5"
            stroke={INK}
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />
        </g>
      );

    case "open":
    default:
      return (
        <g>
          <circle cx="33" cy="47" r="4.6" fill={INK} />
          <circle cx="63" cy="47" r="4.6" fill={INK} />
          <circle cx="34.7" cy="45.3" r="1.5" fill={BELLY} />
          <circle cx="64.7" cy="45.3" r="1.5" fill={BELLY} />
        </g>
      );
  }
}

/**
 * One entry per mood. Swap these for real illustrations when they exist —
 * the component API above does not change.
 */
const FOX_ART: Record<FoxMood, (props: ArtProps) => ReactNode> = {
  reading: (props) => (
    <FoxCanvas {...props}>
      <FoxHead eyes="lowered" />
      {/* An open book, held up so the fox peers over it */}
      <path
        d="M60 99 C52 94.5 41 92.5 31 93.5 L31 108.5 C41 107.5 52 109.5 60 114 Z"
        fill={BELLY}
        stroke={FUR_DEEP}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M60 99 C68 94.5 79 92.5 89 93.5 L89 108.5 C79 107.5 68 109.5 60 114 Z"
        fill={BELLY}
        stroke={FUR_DEEP}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M60 99 V114"
        stroke={FUR_DEEP}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </FoxCanvas>
  ),

  celebrating: (props) => (
    <FoxCanvas {...props}>
      <g opacity="0.9">
        <rect
          x="16"
          y="24"
          width="5"
          height="9"
          rx="2.5"
          fill="var(--fox-primary-bright)"
          transform="rotate(-22 18.5 28.5)"
        />
        <rect
          x="99"
          y="32"
          width="5"
          height="9"
          rx="2.5"
          fill="var(--fox-accent)"
          transform="rotate(28 101.5 36.5)"
        />
        <rect
          x="58"
          y="2"
          width="5"
          height="9"
          rx="2.5"
          fill="var(--fox-warning)"
          transform="rotate(12 60.5 6.5)"
        />
        <circle cx="106" cy="60" r="3" fill="var(--fox-primary-bright)" />
        <circle cx="12" cy="52" r="2.5" fill="var(--fox-accent)" />
        <circle cx="94" cy="14" r="2.5" fill="var(--fox-warning)" />
        <circle cx="26" cy="8" r="2" fill="var(--fox-accent)" />
      </g>
      <FoxHead eyes="happy" />
    </FoxCanvas>
  ),

  empty: (props) => (
    <FoxCanvas {...props}>
      <FoxHead eyes="soft" />
      {/* A single drifting leaf — the only thing on the shelf */}
      <g opacity="0.85">
        <path
          d="M97 76 C105 78.5 107 87 100.5 92 C94 88.5 93.5 81 97 76 Z"
          fill="var(--fox-accent)"
        />
        <path
          d="M97.5 77.5 C99 83 100 88 100.5 92"
          stroke={BELLY}
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.55"
        />
      </g>
      <circle cx="20" cy="86" r="2.2" fill="var(--fox-border-strong)" />
      <circle cx="13" cy="70" r="1.6" fill="var(--fox-border-strong)" />
      <circle cx="107" cy="62" r="1.8" fill="var(--fox-border-strong)" />
    </FoxCanvas>
  ),

  sleeping: (props) => (
    <FoxCanvas {...props}>
      <FoxHead eyes="closed" />
      <g
        stroke={FUR_DEEP}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="motion-safe:animate-pulse"
      >
        <path d="M86 42 h7 l-7 7 h7" strokeWidth="2.5" />
        <path d="M95 27 h9 l-9 9 h9" strokeWidth="3" opacity="0.8" />
        <path d="M103 9 h11 l-11 11 h11" strokeWidth="3.5" opacity="0.6" />
      </g>
    </FoxCanvas>
  ),

  searching: (props) => (
    <FoxCanvas {...props}>
      <FoxHead eyes="squint" />
      <g>
        <circle cx="95" cy="76" r="12" fill={BELLY} opacity="0.45" />
        <circle
          cx="95"
          cy="76"
          r="12"
          stroke={FUR_DEEP}
          strokeWidth="4"
          fill="none"
        />
        <path
          d="M103.5 84.5 L112 94"
          stroke={FUR_DEEP}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
    </FoxCanvas>
  ),
};
