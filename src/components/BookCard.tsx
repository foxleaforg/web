import Link from "next/link";
import type { ReactNode } from "react";
import { BookCover } from "@/components/BookCover";

export type BookCardProps = {
  title: string;
  authors?: string[] | null;
  coverUrl?: string | null;
  pageCount?: number | null;
  /**
   * Publication year. Accepts a string because the local books API returns a
   * full date ("2020-09-15") where Open Library returns a year (1968), and
   * rendering the raw date reads like a bug.
   */
  year?: number | string | null;
  /** Renders the whole card as a link to this book. */
  slug?: string | null;
  /** A control rendered under the metadata — e.g. "Add to Foxleaf". */
  action?: ReactNode;
};

/**
 * A book in a grid.
 *
 * Layout note: the root is `h-full flex-col` and the metadata block uses
 * `flex-1`, so every card in a row ends up the same height no matter how many
 * lines the title wraps to, and any `action` sits flush along a shared
 * baseline. Grids using this must place it in an `items-stretch` track
 * (CSS grid's default).
 *
 * When `slug` is set the card uses the stretched-link pattern from
 * ACCESSIBILITY.md: one real `<a>`, correctly named by the title, whose hit
 * area covers the card. Any `action` inside gets `relative z-1` so it stays
 * clickable above the overlay.
 */
/** Reduces a year or an ISO-ish date to a bare four-digit year. */
function formatYear(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const match = String(value).match(/\d{4}/);
  return match ? match[0] : null;
}

export function BookCard({
  title,
  authors,
  coverUrl,
  pageCount,
  year,
  slug,
  action,
}: BookCardProps) {
  const authorList = authors ?? [];
  const meta = [
    pageCount ? `${pageCount} pages` : null,
    formatYear(year),
  ].filter(Boolean);

  return (
    <article className="group relative flex h-full flex-col">
      <div className="transition-transform duration-200 ease-out group-hover:-translate-y-1 group-focus-within:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none">
        <BookCover title={title} authors={authorList} coverUrl={coverUrl} />
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-0.5">
        <h3 className="text-small leading-snug font-semibold text-foxleaf-ink">
          {slug ? (
            <Link href={`/books/${slug}`} className="stretch-link line-clamp-2">
              {title}
            </Link>
          ) : (
            <span className="line-clamp-2">{title}</span>
          )}
        </h3>

        {authorList.length > 0 ? (
          <p className="text-small line-clamp-1 text-foxleaf-muted">
            {authorList.join(", ")}
          </p>
        ) : null}

        {meta.length > 0 ? (
          <p className="text-caption mt-0.5 text-foxleaf-muted">
            {meta.join(" · ")}
          </p>
        ) : null}
      </div>

      {action ? <div className="relative z-1 mt-3">{action}</div> : null}
    </article>
  );
}
