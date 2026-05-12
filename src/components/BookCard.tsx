import Link from "next/link";
import type { ReactNode } from "react";

export type BookCardProps = {
  title: string;
  authors?: string[] | null;
  coverUrl?: string | null;
  pageCount?: number | null;
  year?: number | null;
  slug?: string | null;
  onClick?: () => void;
  action?: ReactNode;
};

export function BookCard({
  title,
  authors,
  coverUrl,
  pageCount,
  year,
  slug,
  onClick,
  action,
}: BookCardProps) {
  const authorList = authors ?? [];
  const meta = [
    pageCount ? `${pageCount} pages` : null,
    year ? String(year) : null,
  ].filter(Boolean);

  const inner = (
    <div className="flex h-full flex-col">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-amber-200 via-orange-200 to-amber-300 shadow-sm ring-1 ring-stone-900/5 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={`Cover of ${title}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full w-full items-center justify-center text-5xl"
          >
            📚
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-stone-900">
          {title}
        </h3>
        {authorList.length > 0 ? (
          <p className="line-clamp-1 text-sm text-stone-600">
            {authorList.join(", ")}
          </p>
        ) : null}
        {meta.length > 0 ? (
          <p className="mt-0.5 text-xs text-stone-500">{meta.join(" · ")}</p>
        ) : null}
      </div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );

  if (slug) {
    return (
      <Link
        href={`/books/${slug}`}
        className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
      >
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
      >
        {inner}
      </button>
    );
  }

  return <div className="group block rounded-2xl">{inner}</div>;
}
