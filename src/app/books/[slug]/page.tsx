"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { DNFReasonModal } from "@/components/DNFReasonModal";
import { RatingInput } from "@/components/RatingInput";
import {
  SpoilerBlock,
  type SpoilerSeverity,
} from "@/components/SpoilerBlock";
import { StatusBadge, type ReadingStatus } from "@/components/StatusBadge";
import { StatusDropdown } from "@/components/StatusDropdown";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

type Author = { id: string; name: string; slug: string };
type Genre = { id: string; name: string; slug: string };

type BookDetail = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  page_count: number | null;
  first_published: string | null;
  authors: Author[];
  description: string | null;
  language_original: string | null;
  genres: Genre[];
};

type Rating = {
  id: string;
  user_id: string;
  book_id: string;
  overall_score: number;
};

type RatingSummary = {
  book_id: string;
  average_score: number;
  total_ratings: number;
};

type UserBook = {
  id: string;
  book_id: string;
  status: ReadingStatus;
};

type Shelf = {
  id: string;
  name: string;
  slug: string;
  shelf_type: "default" | "custom" | string;
  book_count: number;
};

type MoodTag = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
};

type SpoilerMeta = {
  id: string;
  placeholder_key: string;
  severity: SpoilerSeverity;
};

type Review = {
  id: string;
  user_id: string;
  username: string;
  book_id: string;
  review_type: string;
  body: string;
  helpful_count: number;
  spoiler_blocks: SpoilerMeta[];
  mood_tags: MoodTag[];
  created_at: string;
  updated_at: string;
};

const DESCRIPTION_PREVIEW = 300;

export default function BookDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [loggedIn, setLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState<Rating | null>(null);
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [userBook, setUserBook] = useState<UserBook | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);

  const [savingRating, setSavingRating] = useState(false);
  const [shelfBusy, setShelfBusy] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [shelfMenuOpen, setShelfMenuOpen] = useState(false);
  const [addingToShelf, setAddingToShelf] = useState(false);
  const [shelfNotice, setShelfNotice] = useState<string | null>(null);

  // Set once the dnf status PUT lands, which the reason endpoint requires.
  const [dnfOpen, setDnfOpen] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await api.get<BookDetail>(`/books/${slug}`);
        if (cancelled) return;
        setBook(data);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load book.";
        if (/not found/i.test(message) || /404/.test(message)) {
          setNotFound(true);
        } else {
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Once we have the book, load the always-public summary and reviews.
  useEffect(() => {
    if (!book) return;
    let cancelled = false;
    (async () => {
      try {
        const [summaryData, reviewsData] = await Promise.all([
          api
            .get<RatingSummary>(`/ratings/book/${book.id}/summary`)
            .catch(() => null),
          api.get<Review[]>(`/reviews/book/${book.id}`).catch(() => []),
        ]);
        if (cancelled) return;
        if (summaryData) setSummary(summaryData);
        setReviews(reviewsData ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book]);

  // If logged in, load the user's rating + shelf status for this book.
  useEffect(() => {
    if (!book || !loggedIn) return;
    let cancelled = false;
    (async () => {
      const ratingPromise = api
        .get<Rating>(`/ratings/me/book/${book.id}`)
        .catch(() => null);
      const shelfPromise = api
        .get<UserBook[]>("/shelves/books/all")
        .catch<UserBook[]>(() => []);
      const myReviewsPromise = api
        .get<Review[]>("/reviews/me")
        .catch<Review[]>(() => []);
      const shelvesPromise = api
        .get<Shelf[]>("/shelves/")
        .catch<Shelf[]>(() => []);
      const [r, ubs, mine, shelfList] = await Promise.all([
        ratingPromise,
        shelfPromise,
        myReviewsPromise,
        shelvesPromise,
      ]);
      if (cancelled) return;
      setRating(r);
      const found = ubs.find((u) => u.book_id === book.id) ?? null;
      setUserBook(found);
      setMyReview(mine.find((rev) => rev.book_id === book.id) ?? null);
      setShelves(shelfList);
    })();
    return () => {
      cancelled = true;
    };
  }, [book, loggedIn]);

  async function handleRate(score: number) {
    if (!book) return;
    setSavingRating(true);
    setError(null);
    try {
      let next: Rating;
      if (rating) {
        next = await api.put<Rating>(`/ratings/${rating.id}`, { score });
      } else {
        next = await api.post<Rating>("/ratings/rate", {
          book_id: book.id,
          score,
        });
      }
      setRating(next);
      // Refresh aggregate.
      api
        .get<RatingSummary>(`/ratings/book/${book.id}/summary`)
        .then(setSummary)
        .catch(() => {});
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't save rating.",
      );
    } finally {
      setSavingRating(false);
    }
  }

  async function handleAddToLibrary() {
    if (!book) return;
    setShelfBusy(true);
    setError(null);
    try {
      const ub = await api.post<UserBook>("/shelves/want-to-read/books", {
        book_id: book.id,
      });
      setUserBook(ub);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't add to library.",
      );
    } finally {
      setShelfBusy(false);
    }
  }

  async function handleStatusChange(next: ReadingStatus) {
    if (!book || !userBook) return;
    const previous = userBook.status;
    setUserBook({ ...userBook, status: next });
    try {
      await api.put(`/shelves/books/${book.id}/status`, { status: next });
      // The reason endpoint requires the dnf status to be committed first.
      if (next === "dnf") {
        setDnfOpen(true);
      }
    } catch (err) {
      setUserBook({ ...userBook, status: previous });
      setError(
        err instanceof Error ? err.message : "Couldn't update status.",
      );
    }
  }

  async function handleAddToShelf(shelf: Shelf) {
    if (!book) return;
    setAddingToShelf(true);
    setShelfNotice(null);
    setError(null);
    try {
      await api.post(`/shelves/${shelf.slug}/books`, { book_id: book.id });
      setShelfNotice(`Added to ${shelf.name}`);
      // Adding to a custom shelf also puts the book in the library, so pick up
      // the user_book it created.
      if (!userBook) {
        const ubs = await api
          .get<UserBook[]>("/shelves/books/all")
          .catch<UserBook[]>(() => []);
        setUserBook(ubs.find((u) => u.book_id === book.id) ?? null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't add to that shelf.";
      // The API 409s when the book is already on the shelf — not worth an
      // error banner.
      setShelfNotice(
        /already exists/i.test(message)
          ? `Already on ${shelf.name}`
          : message,
      );
    } finally {
      setAddingToShelf(false);
    }
  }

  if (loading || !authChecked) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <BookSkeleton />
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <div aria-hidden className="text-5xl">
            📖
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">
            Book not found
          </h1>
          <p className="text-sm text-stone-600">
            We couldn&apos;t find a book at this address.
          </p>
          <Link
            href="/search"
            className="mt-3 rounded-full bg-stone-800 px-5 py-2 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900"
          >
            Search for a book
          </Link>
        </div>
      </main>
    );
  }

  if (!book) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20 text-center text-stone-600">
        {error ?? "Something went wrong."}
      </main>
    );
  }

  // Default shelves are driven by reading status, so only custom ones are
  // worth offering here.
  const customShelves = shelves.filter((s) => s.shelf_type !== "default");
  const description = book.description ?? "";
  const showDescToggle = description.length > DESCRIPTION_PREVIEW;
  const descText =
    descExpanded || !showDescToggle
      ? description
      : `${description.slice(0, DESCRIPTION_PREVIEW).trimEnd()}…`;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      {error ? (
        <p
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,240px)_1fr] md:items-start">
        <div className="mx-auto w-full max-w-[240px] md:mx-0">
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-amber-200 via-orange-200 to-amber-300 shadow-lg ring-1 ring-stone-900/5">
            {book.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.cover_url}
                alt={`Cover of ${book.title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="flex h-full w-full items-center justify-center text-6xl"
              >
                📚
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-stone-900 sm:text-4xl">
              {book.title}
            </h1>
            {book.authors.length > 0 ? (
              <p className="mt-2 text-base text-stone-600">
                by{" "}
                {book.authors.map((a, i) => (
                  <Fragment key={a.id}>
                    {i > 0 ? ", " : ""}
                    <span className="font-medium text-stone-800">
                      {a.name}
                    </span>
                  </Fragment>
                ))}
              </p>
            ) : null}
          </div>

          <MetaLine
            pageCount={book.page_count}
            firstPublished={book.first_published}
            language={book.language_original}
          />

          {book.genres.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {book.genres.map((g) => (
                <span
                  key={g.id}
                  className="inline-flex items-center rounded-full bg-amber-100/80 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200/60"
                >
                  {g.name}
                </span>
              ))}
            </div>
          ) : null}

          {description ? (
            <div className="mt-2 text-sm leading-relaxed text-stone-700">
              <p className="whitespace-pre-wrap">{descText}</p>
              {showDescToggle ? (
                <button
                  type="button"
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-2 text-sm font-medium text-stone-800 underline-offset-2 hover:underline"
                >
                  {descExpanded ? "Show less" : "Read more"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {loggedIn ? (
        <section className="mt-12 rounded-3xl border border-stone-200 bg-white/70 p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                In your library
              </h2>
              {userBook ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-600">
                      Currently:
                    </span>
                    <StatusBadge status={userBook.status} />
                  </div>
                  <div className="w-56">
                    <StatusDropdown
                      status={userBook.status}
                      onChange={handleStatusChange}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToLibrary}
                  disabled={shelfBusy}
                  className="self-start rounded-full bg-stone-800 px-5 py-2 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {shelfBusy ? "Adding…" : "Add to Library"}
                </button>
              )}

              <div className="relative mt-1 self-start">
                <button
                  type="button"
                  onClick={() => setShelfMenuOpen((v) => !v)}
                  disabled={addingToShelf}
                  aria-haspopup="menu"
                  aria-expanded={shelfMenuOpen}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addingToShelf ? "Adding…" : "Add to Shelf"}
                  <span aria-hidden className="text-xs text-stone-500">
                    ▾
                  </span>
                </button>

                {shelfMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute left-0 z-20 mt-1.5 w-60 overflow-hidden rounded-2xl border border-stone-200 bg-white py-1 shadow-lg ring-1 ring-stone-900/5"
                  >
                    {customShelves.length === 0 ? (
                      <p className="px-4 py-3 text-xs leading-relaxed text-stone-500">
                        No custom shelves yet.{" "}
                        <Link
                          href="/shelves"
                          className="font-medium text-stone-800 underline-offset-2 hover:underline"
                        >
                          Create one
                        </Link>{" "}
                        to group books your way.
                      </p>
                    ) : (
                      customShelves.map((shelf) => (
                        <button
                          key={shelf.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShelfMenuOpen(false);
                            handleAddToShelf(shelf);
                          }}
                          className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900"
                        >
                          {shelf.name}
                          <span className="text-xs text-stone-400">
                            {shelf.book_count}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>

              {shelfNotice ? (
                <p
                  role="status"
                  className="self-start rounded-full bg-amber-100/80 px-3 py-1 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200/60"
                >
                  {shelfNotice}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 md:items-end">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Your rating
              </h2>
              <RatingInput
                currentRating={rating ? Math.round(rating.overall_score) : null}
                onRate={handleRate}
                disabled={savingRating}
              />
              <p className="text-sm text-stone-600">
                {rating
                  ? `Your rating: ${formatScore(rating.overall_score)}/10`
                  : "Click a number to rate this book."}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-stone-200 pt-4">
            <Link
              href={`/books/${book.slug}/review`}
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100"
            >
              ✍️ {myReview ? "Edit Your Review" : "Write a Review"}
            </Link>
          </div>
        </section>
      ) : (
        <section className="mt-12 rounded-3xl border border-dashed border-stone-300 bg-white/40 p-6 text-center">
          <p className="text-sm text-stone-700">
            <Link
              href="/login"
              className="font-medium text-stone-900 underline-offset-2 hover:underline"
            >
              Log in
            </Link>{" "}
            to rate this book and add it to your library.
          </p>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-stone-900">
          Community rating
        </h2>
        {summary && summary.total_ratings > 0 ? (
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-5xl font-semibold text-stone-900">
              {summary.average_score.toFixed(1)}
            </span>
            <span className="text-sm text-stone-500">
              / 10 · {summary.total_ratings.toLocaleString()}{" "}
              {summary.total_ratings === 1 ? "rating" : "ratings"}
            </span>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-600">
            No ratings yet. Be the first!
          </p>
        )}
      </section>

      <section id="reviews" className="mt-14 scroll-mt-20">
        <h2 className="text-lg font-semibold text-stone-900">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">No reviews yet.</p>
        ) : (
          <ul className="mt-5 flex flex-col gap-5">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </ul>
        )}
      </section>

      {dnfOpen ? (
        <DNFReasonModal
          bookId={book.id}
          bookTitle={book.title}
          isOpen
          onClose={() => setDnfOpen(false)}
        />
      ) : null}
    </main>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  async function handleHelpful() {
    if (!isLoggedIn()) {
      setMarkError("Log in to vote.");
      return;
    }
    setMarking(true);
    setMarkError(null);
    try {
      const data = await api.post<{ helpful_count: number }>(
        `/reviews/${review.id}/helpful`,
        {},
      );
      setHelpfulCount(data.helpful_count);
    } catch (err) {
      setMarkError(
        err instanceof Error ? err.message : "Couldn't mark helpful.",
      );
    } finally {
      setMarking(false);
    }
  }

  const typeLabel =
    review.review_type === "quick_thoughts"
      ? "Quick thoughts"
      : review.review_type === "full"
        ? "Full review"
        : review.review_type
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <li className="rounded-3xl border border-stone-200 bg-white/70 p-5 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-200 text-sm font-semibold text-stone-800"
          >
            {review.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900">
              {review.username}
            </p>
            <p className="text-xs text-stone-500">
              {formatDate(review.created_at)}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 ring-1 ring-inset ring-stone-200">
          {typeLabel}
        </span>
      </header>

      <div className="mt-4">
        <ReviewBody body={review.body} blocks={review.spoiler_blocks} />
      </div>

      {review.mood_tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {review.mood_tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full bg-orange-100/80 px-2.5 py-0.5 text-xs font-medium text-orange-900 ring-1 ring-inset ring-orange-200/60"
            >
              {tag.name}
            </span>
          ))}
        </div>
      ) : null}

      <footer className="mt-4 flex items-center justify-between border-t border-stone-200 pt-3">
        <button
          type="button"
          onClick={handleHelpful}
          disabled={marking}
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden>👍</span>
          Helpful
          <span className="text-stone-500">· {helpfulCount}</span>
        </button>
        {markError ? (
          <span className="text-xs text-red-600" role="alert">
            {markError}
          </span>
        ) : null}
      </footer>
    </li>
  );
}

function ReviewBody({
  body,
  blocks,
}: {
  body: string;
  blocks: SpoilerMeta[];
}) {
  const segments = useMemo(() => splitOnSpoilers(body, blocks), [body, blocks]);

  if (segments.length === 0) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
        {body}
      </p>
    );
  }

  return (
    <div className="text-sm leading-relaxed text-stone-800">
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <p key={i} className="whitespace-pre-wrap">
            {seg.text}
          </p>
        ) : (
          <SpoilerBlock
            key={seg.block.id}
            spoilerBlockId={seg.block.id}
            severity={seg.block.severity}
          />
        ),
      )}
      {/* Append any blocks that weren't found inline. */}
      {blocks
        .filter((b) => !body.includes(b.placeholder_key))
        .map((block) => (
          <SpoilerBlock
            key={block.id}
            spoilerBlockId={block.id}
            severity={block.severity}
          />
        ))}
    </div>
  );
}

type BodySegment =
  | { type: "text"; text: string }
  | { type: "spoiler"; block: SpoilerMeta };

function splitOnSpoilers(body: string, blocks: SpoilerMeta[]): BodySegment[] {
  const inlineBlocks = blocks.filter((b) => body.includes(b.placeholder_key));
  if (inlineBlocks.length === 0) {
    return body.trim() ? [{ type: "text", text: body }] : [];
  }
  // Build a regex that matches any placeholder_key, ordered by length desc to avoid prefix issues.
  const keys = inlineBlocks
    .map((b) => b.placeholder_key)
    .sort((a, b) => b.length - a.length);
  const escaped = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = body.split(re);

  const segments: BodySegment[] = [];
  for (const part of parts) {
    if (!part) continue;
    const block = inlineBlocks.find((b) => b.placeholder_key === part);
    if (block) {
      segments.push({ type: "spoiler", block });
    } else {
      segments.push({ type: "text", text: part });
    }
  }
  return segments;
}

function MetaLine({
  pageCount,
  firstPublished,
  language,
}: {
  pageCount: number | null;
  firstPublished: string | null;
  language: string | null;
}) {
  const parts: string[] = [];
  if (pageCount) parts.push(`${pageCount} pages`);
  if (firstPublished) {
    const year = firstPublished.slice(0, 4);
    if (year) parts.push(year);
  }
  if (language) parts.push(language.toUpperCase());
  if (parts.length === 0) return null;
  return (
    <p className="text-sm text-stone-500">{parts.join(" · ")}</p>
  );
}

function BookSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,240px)_1fr]">
      <div className="mx-auto w-full max-w-[240px] md:mx-0">
        <div className="aspect-[2/3] w-full animate-pulse rounded-2xl bg-stone-200/70" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-8 w-3/4 animate-pulse rounded bg-stone-200/70" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-stone-200/70" />
        <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-stone-200/70" />
        <div className="mt-4 h-20 w-full animate-pulse rounded bg-stone-200/70" />
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
