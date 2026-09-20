"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";

/**
 * A book cover, with a designed fallback for books that have no cover art.
 *
 * The fallback is not a placeholder glyph floating in space — it is the title
 * typeset in Fraunces on a warm gradient with a spine, so a shelf of
 * cover-less books still looks deliberate. The gradient is picked from the
 * title, so a given book always gets the same one (and no hydration
 * mismatch, unlike anything random).
 *
 * The fallback is `aria-hidden`: it renders the title, which every caller
 * already shows as real text next to or below the cover. Announcing it twice
 * is noise. A real cover image gets proper alt text.
 *
 * It also catches *broken* covers, not just missing ones. Two distinct
 * failures, both common with Open Library:
 *
 *   1. The request fails outright — caught by `onError`.
 *   2. Open Library answers `200 OK` with a **1×1 pixel** for a cover it does
 *      not have. The browser decodes that happily, so `onError` never fires
 *      and the card renders a stretched single pixel: a blank box. Catching
 *      it means measuring `naturalWidth` once the image loads.
 *
 * A blank box is the one outcome worse than having no cover at all.
 */

/** Anything smaller than this in either axis is a tracking pixel, not art. */
const MIN_COVER_PX = 50;

const PALETTES = [
  "from-foxleaf-cover-1-from to-foxleaf-cover-1-to",
  "from-foxleaf-cover-2-from to-foxleaf-cover-2-to",
  "from-foxleaf-cover-3-from to-foxleaf-cover-3-to",
  "from-foxleaf-cover-4-from to-foxleaf-cover-4-to",
] as const;

/** Stable, tiny string hash (djb2). Deterministic across server and client. */
function paletteFor(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return PALETTES[Math.abs(h) % PALETTES.length];
}

export type BookCoverProps = {
  title: string;
  authors?: string[] | null;
  coverUrl?: string | null;
  /** Scales the fallback typography. Covers below ~120px wide want "sm". */
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Skip lazy-loading for an above-the-fold hero cover. */
  eager?: boolean;
};

const FALLBACK_TYPE = {
  sm: { title: "text-[0.8rem] leading-snug", author: "text-[0.6rem]", pad: "p-3" },
  md: { title: "text-base leading-snug", author: "text-[0.7rem]", pad: "p-4" },
  lg: { title: "text-h3", author: "text-caption", pad: "p-6" },
} as const;

export function BookCover({
  title,
  authors,
  coverUrl,
  size = "sm",
  className,
  eager = false,
}: BookCoverProps) {
  const type = FALLBACK_TYPE[size];
  const [imageBroken, setImageBroken] = useState(false);
  const showImage = Boolean(coverUrl) && !imageBroken;

  /**
   * Runs both as a ref callback (catches images already cached and decoded
   * before React attaches handlers) and from `onLoad` (catches the rest).
   */
  function assessLoadedImage(img: HTMLImageElement | null) {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    if (img.naturalWidth < MIN_COVER_PX || img.naturalHeight < MIN_COVER_PX) {
      setImageBroken(true);
    }
  }

  return (
    <div
      className={cn(
        "relative aspect-2/3 w-full overflow-hidden rounded-card",
        "bg-foxleaf-surface-muted shadow-lift",
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={assessLoadedImage}
          src={coverUrl ?? undefined}
          alt={`Cover of ${title}`}
          loading={eager ? "eager" : "lazy"}
          onLoad={(e) => assessLoadedImage(e.currentTarget)}
          onError={() => setImageBroken(true)}
          className="size-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className={cn(
            "flex size-full flex-col justify-between bg-linear-to-br text-foxleaf-cover-fg",
            paletteFor(title),
            type.pad,
          )}
        >
          {/* Spine: sells it as a book rather than a coloured rectangle. */}
          <span className="absolute inset-y-0 left-0 w-[6%] min-w-[4px] bg-black/15" />
          <span className="absolute inset-y-0 left-[6%] w-px bg-white/20" />

          <p
            className={cn(
              "font-display line-clamp-5 pl-[7%] font-semibold text-balance",
              type.title,
            )}
            style={{ fontVariationSettings: '"SOFT" 24' }}
          >
            {title}
          </p>

          {authors && authors.length > 0 ? (
            <p className={cn("line-clamp-1 pl-[7%] opacity-80", type.author)}>
              {authors.join(", ")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
