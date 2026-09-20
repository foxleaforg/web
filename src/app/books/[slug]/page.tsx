"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { DNFReasonModal } from "@/components/DNFReasonModal";
import { Fox } from "@/components/Fox";
import { RatingInput } from "@/components/RatingInput";
import {
  SpoilerBlock,
  type SpoilerSeverity,
} from "@/components/SpoilerBlock";
import { StatusBadge, type ReadingStatus } from "@/components/StatusBadge";
import { StatusDropdown } from "@/components/StatusDropdown";
import { Badge, Button, Card } from "@/components/ui";
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
  // A small moment of delight after a rating lands. Purely additive: the
  // rating itself is already confirmed by the filled numbers.
  const [celebrate, setCelebrate] = useState(false);

  // Rating save bookkeeping — see handleRate.
  const ratingRef = useRef<Rating | null>(null);
  const savedScoreRef = useRef<number | null>(null);
  const desiredScoreRef = useRef<number | null>(null);
  const pendingSavesRef = useRef(0);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

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
    if (!celebrate) return;
    const handle = setTimeout(() => setCelebrate(false), 4000);
    return () => clearTimeout(handle);
  }, [celebrate]);

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
      // Seed the save bookkeeping so the first edit issues a PUT against the
      // existing row rather than POSTing a second one.
      ratingRef.current = r;
      savedScoreRef.current = r ? Math.round(r.overall_score) : null;
      const found = ubs.find((u) => u.book_id === book.id) ?? null;
      setUserBook(found);
      setMyReview(mine.find((rev) => rev.book_id === book.id) ?? null);
      setShelves(shelfList);
    })();
    return () => {
      cancelled = true;
    };
  }, [book, loggedIn]);

  /**
   * Ratings now save without disabling the input (see RatingInput), so a
   * keyboard user arrowing from 1 to 10 can fire ten of these in a few
   * hundred milliseconds. Two things keep that safe:
   *
   *   Serialised — each save waits for the previous one. Reading `rating`
   *   from state instead would let several calls all see `null` and POST a
   *   duplicate rating each, so the current row is tracked in a ref.
   *
   *   Coalesced — a queued save re-reads the latest requested score at the
   *   moment it runs and skips if that score is already stored. Arrowing
   *   across the scale collapses to one or two requests, not ten.
   */
  function handleRate(score: number) {
    if (!book) return;
    desiredScoreRef.current = score;
    setError(null);
    pendingSavesRef.current += 1;
    setSavingRating(true);

    saveChainRef.current = saveChainRef.current
      .then(async () => {
        const target = desiredScoreRef.current;
        if (target === null || target === savedScoreRef.current) return;

        const existing = ratingRef.current;
        const next = existing
          ? await api.put<Rating>(`/ratings/${existing.id}`, { score: target })
          : await api.post<Rating>("/ratings/rate", {
              book_id: book.id,
              score: target,
            });

        ratingRef.current = next;
        savedScoreRef.current = target;
        setRating(next);
        if (!existing) setCelebrate(true);

        const summaryData = await api
          .get<RatingSummary>(`/ratings/book/${book.id}/summary`)
          .catch(() => null);
        if (summaryData) setSummary(summaryData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Couldn't save rating.");
      })
      .finally(() => {
        pendingSavesRef.current -= 1;
        if (pendingSavesRef.current === 0) setSavingRating(false);
      });
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
        <div className="flex flex-col items-center gap-6 text-center">
          <Fox mood="searching" size="lg" decorative />
          <div className="flex flex-col gap-2">
            <h1 className="text-h2">Book not found</h1>
            <p className="text-body text-foxleaf-muted">
              We couldn&apos;t find a book at this address.
            </p>
          </div>
          <Link
            href="/search"
            className="tap-target inline-flex h-11 items-center rounded-control bg-foxleaf-primary px-5 text-small font-medium text-foxleaf-primary-fg shadow-primary transition-colors hover:bg-foxleaf-primary-hover"
          >
            Search for a book
          </Link>
        </div>
      </main>
    );
  }

  if (!book) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20">
        <p role="alert" className="text-body text-center text-foxleaf-muted">
          {error ?? "Something went wrong."}
        </p>
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 sm:py-14">
      {error ? (
        <p
          role="alert"
          className="text-small mb-8 rounded-control border border-foxleaf-danger bg-foxleaf-danger-tint px-4 py-3 text-foxleaf-danger-tint-fg"
        >
          {error}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-8 sm:gap-12 md:grid-cols-[minmax(0,260px)_1fr] md:items-start">
        <div className="mx-auto w-full max-w-[220px] sm:max-w-[260px] md:mx-0">
          <BookCover
            title={book.title}
            authors={book.authors.map((a) => a.name)}
            coverUrl={book.cover_url}
            size="lg"
            eager
            className="shadow-float"
          />
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-h1 sm:text-display">{book.title}</h1>
            {book.authors.length > 0 ? (
              <p className="text-body-lg mt-3 text-foxleaf-muted">
                by{" "}
                {book.authors.map((a, i) => (
                  <Fragment key={a.id}>
                    {i > 0 ? ", " : ""}
                    <span className="font-medium text-foxleaf-ink">
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
            <ul className="flex flex-wrap gap-2">
              {book.genres.map((g) => (
                <li key={g.id}>
                  <Badge variant="green" size="md">
                    {g.name}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}

          {description ? (
            <div className="text-body mt-1 text-foxleaf-ink">
              <p className="whitespace-pre-wrap">{descText}</p>
              {showDescToggle ? (
                <button
                  type="button"
                  onClick={() => setDescExpanded((v) => !v)}
                  aria-expanded={descExpanded}
                  className="text-small tap-target mt-3 font-medium text-foxleaf-primary underline-offset-4 hover:underline"
                >
                  {descExpanded ? "Show less" : "Read more"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {loggedIn ? (
        <Card as="section" padding="lg" className="mt-12" aria-labelledby="your-shelf">
          <h2 id="your-shelf" className="text-h3 mb-6">
            Your shelf
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col items-start gap-3">
              <h3 className="text-caption font-semibold tracking-wide text-foxleaf-muted uppercase">
                Reading status
              </h3>

              {userBook ? (
                <div className="flex w-full flex-col items-start gap-3">
                  <StatusBadge status={userBook.status} />
                  <div className="w-full max-w-64">
                    <StatusDropdown
                      status={userBook.status}
                      onChange={handleStatusChange}
                    />
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleAddToLibrary}
                  loading={shelfBusy}
                  loadingLabel="Adding to your library"
                >
                  Add to Library
                </Button>
              )}

              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShelfMenuOpen((v) => !v)}
                  loading={addingToShelf}
                  loadingLabel="Adding to shelf"
                  aria-haspopup="menu"
                  aria-expanded={shelfMenuOpen}
                >
                  Add to Shelf
                  <span aria-hidden>▾</span>
                </Button>

                {shelfMenuOpen ? (
                  <div
                    role="menu"
                    aria-label="Your shelves"
                    className="absolute left-0 z-20 mt-1.5 w-64 overflow-hidden rounded-card border border-foxleaf-border bg-foxleaf-surface py-1 shadow-float"
                  >
                    {customShelves.length === 0 ? (
                      <p className="text-caption px-4 py-3 leading-relaxed text-foxleaf-muted">
                        No custom shelves yet.{" "}
                        <Link
                          href="/shelves"
                          className="font-medium text-foxleaf-primary underline-offset-2 hover:underline"
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
                          className="text-small flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-foxleaf-ink transition-colors hover:bg-foxleaf-cream-deep"
                        >
                          {shelf.name}
                          <span className="text-caption text-foxleaf-muted">
                            {shelf.book_count}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>

              {shelfNotice ? (
                <p role="status">
                  <Badge variant="green" size="md">
                    {shelfNotice}
                  </Badge>
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 md:border-l md:border-foxleaf-border md:pl-8">
              <h3 className="text-caption font-semibold tracking-wide text-foxleaf-muted uppercase">
                Your rating
              </h3>
              <RatingInput
                currentRating={rating ? Math.round(rating.overall_score) : null}
                onRate={handleRate}
                saving={savingRating}
              />

              {/* Delight, kept out of the way: it never displaces content
                  (absolutely positioned) and it fades in only when motion
                  is allowed. `role="status"` announces it politely. */}
              {celebrate ? (
                <div
                  role="status"
                  className="relative flex items-center gap-3 rounded-card bg-foxleaf-primary-tint px-4 py-3 motion-safe:animate-fade-in-up"
                >
                  <Fox mood="celebrating" size="sm" decorative />
                  <p className="text-small font-medium text-foxleaf-primary-tint-fg">
                    First rating logged. Nice one.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 border-t border-foxleaf-border pt-6">
            <Link
              href={`/books/${book.slug}/review`}
              className="text-small tap-target inline-flex h-10 items-center gap-2 rounded-control border border-foxleaf-border-strong px-4 font-medium text-foxleaf-ink transition-colors hover:border-foxleaf-primary hover:bg-foxleaf-cream-deep hover:text-foxleaf-primary"
            >
              <span aria-hidden>✍️</span>
              {myReview ? "Edit your review" : "Write a review"}
            </Link>
          </div>
        </Card>
      ) : (
        <Card
          as="section"
          padding="lg"
          className="mt-12 border-dashed text-center"
        >
          <p className="text-body text-foxleaf-ink">
            <Link
              href="/login"
              className="font-medium text-foxleaf-primary underline-offset-4 hover:underline"
            >
              Log in
            </Link>{" "}
            to rate this book and add it to your library.
          </p>
        </Card>
      )}

      <section className="mt-14" aria-labelledby="community-rating">
        <h2 id="community-rating" className="text-h3">
          Community rating
        </h2>
        {summary && summary.total_ratings > 0 ? (
          <div className="mt-5 flex items-center gap-5">
            <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-card bg-foxleaf-primary text-foxleaf-primary-fg shadow-primary">
              <span className="font-display text-[2.25rem] leading-none font-semibold">
                {summary.average_score.toFixed(1)}
              </span>
              <span className="text-caption opacity-80" aria-hidden>
                out of 10
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-body font-medium text-foxleaf-ink">
                <span className="sr-only">
                  Average score {summary.average_score.toFixed(1)} out of 10.{" "}
                </span>
                {summary.total_ratings.toLocaleString()}{" "}
                {summary.total_ratings === 1 ? "rating" : "ratings"}
              </p>
              <p className="text-small text-foxleaf-muted">
                from readers on Foxleaf
              </p>
            </div>
          </div>
        ) : (
          <Card padding="lg" className="mt-5">
            <p className="text-body text-foxleaf-muted">
              No ratings yet.{" "}
              <span className="font-medium text-foxleaf-ink">
                Be the first to rate it.
              </span>
            </p>
          </Card>
        )}
      </section>

      <section id="reviews" className="mt-14 scroll-mt-20">
        <h2 className="text-h3">
          Reviews
          {reviews.length > 0 ? (
            <span className="text-body ml-3 font-sans font-normal text-foxleaf-muted">
              {reviews.length}
            </span>
          ) : null}
        </h2>
        {reviews.length === 0 ? (
          <Card padding="lg" className="mt-5">
            <Fox
              mood="reading"
              size="md"
              message="No reviews yet. Be the first to say what you thought."
            />
          </Card>
        ) : (
          <ul className="mt-6 flex flex-col gap-5">
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
    <Card as="li" padding="md">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="text-small grid size-10 shrink-0 place-items-center rounded-full bg-foxleaf-primary-tint font-semibold text-foxleaf-primary-tint-fg"
          >
            {review.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-small font-semibold text-foxleaf-ink">
              {review.username}
            </p>
            <time
              dateTime={review.created_at}
              className="text-caption text-foxleaf-muted"
            >
              {formatDate(review.created_at)}
            </time>
          </div>
        </div>
        <Badge variant="gray" size="md">
          {typeLabel}
        </Badge>
      </header>

      <div className="mt-4">
        <ReviewBody body={review.body} blocks={review.spoiler_blocks} />
      </div>

      {review.mood_tags.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {review.mood_tags.map((tag) => (
            <li key={tag.id}>
              <Badge variant="primary">{tag.name}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <footer className="mt-5 flex flex-wrap items-center gap-3 border-t border-foxleaf-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHelpful}
          loading={marking}
          loadingLabel="Marking as helpful"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="size-4"
          >
            <path
              d="M5 7.2 8.1 2.3a1.6 1.6 0 0 1 2.9 1.1L10.4 6.4h2.8a1.4 1.4 0 0 1 1.37 1.71l-.9 4.2A1.7 1.7 0 0 1 12 13.7H5Z"
              strokeLinejoin="round"
            />
            <path d="M5 7.2v6.5H2.8a.9.9 0 0 1-.9-.9V8.1a.9.9 0 0 1 .9-.9Z" />
          </svg>
          Helpful
          <span className="text-foxleaf-muted">· {helpfulCount}</span>
        </Button>
        {markError ? (
          <span className="text-caption text-foxleaf-danger" role="alert">
            {markError}
          </span>
        ) : null}
      </footer>
    </Card>
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
      <p className="text-body whitespace-pre-wrap text-foxleaf-ink">{body}</p>
    );
  }

  return (
    <div className="text-body text-foxleaf-ink">
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
  return <p className="text-small text-foxleaf-muted">{parts.join(" · ")}</p>;
}

function BookSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-8 sm:gap-12 md:grid-cols-[minmax(0,260px)_1fr]"
      aria-hidden
    >
      <div className="mx-auto w-full max-w-[220px] sm:max-w-[260px] md:mx-0">
        <div className="aspect-2/3 w-full rounded-card bg-foxleaf-cream-deep motion-safe:animate-pulse" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-10 w-3/4 rounded-control bg-foxleaf-cream-deep motion-safe:animate-pulse" />
        <div className="h-5 w-1/2 rounded-control bg-foxleaf-cream-deep motion-safe:animate-pulse" />
        <div className="h-3.5 w-1/3 rounded-full bg-foxleaf-cream-deep motion-safe:animate-pulse" />
        <div className="mt-2 h-24 w-full rounded-card bg-foxleaf-cream-deep motion-safe:animate-pulse" />
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
