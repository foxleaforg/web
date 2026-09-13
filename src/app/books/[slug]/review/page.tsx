"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SpoilerSeverity } from "@/components/SpoilerBlock";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

type Author = { id: string; name: string; slug: string };

type BookDetail = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  authors: Author[];
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

type MyReview = {
  id: string;
  book_id: string;
  review_type: string;
  body: string;
  is_public: boolean;
  spoiler_blocks: SpoilerMeta[];
  mood_tags: MoodTag[];
};

const BODY_MAX = 10000;

const REVIEW_TYPES = [
  {
    value: "quick_thoughts",
    label: "Quick Thoughts",
    hint: "A few lines, no pressure",
  },
  { value: "full_review", label: "Full Review", hint: "The proper deep dive" },
  { value: "reaction", label: "Reaction", hint: "Raw, straight off the last page" },
] as const;

type ReviewType = (typeof REVIEW_TYPES)[number]["value"];

const SEVERITIES: {
  value: SpoilerSeverity;
  label: string;
  active: string;
}[] = [
  { value: "minor", label: "Minor", active: "bg-stone-700 text-white ring-stone-700" },
  { value: "major", label: "Major", active: "bg-amber-500 text-stone-900 ring-amber-500" },
  { value: "ending", label: "Ending", active: "bg-red-500 text-white ring-red-500" },
];

// Spoiler drafts need a stable identity for React keys and per-block edits:
// content starts empty and is not unique, so it can't serve as the key.
let uidCounter = 0;
function nextUid(): number {
  uidCounter += 1;
  return uidCounter;
}

type SpoilerDraft = {
  uid: number;
  content: string;
  severity: SpoilerSeverity;
};

function normalizeType(value: string): ReviewType {
  const match = REVIEW_TYPES.find((t) => t.value === value);
  return match ? match.value : "quick_thoughts";
}

export default function WriteReviewPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const router = useRouter();

  const [loggedIn, setLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [book, setBook] = useState<BookDetail | null>(null);
  const [moodTags, setMoodTags] = useState<MoodTag[]>([]);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [spoilerWarning, setSpoilerWarning] = useState(false);

  const [reviewType, setReviewType] = useState<ReviewType>("quick_thoughts");
  const [body, setBody] = useState("");
  const [spoilers, setSpoilers] = useState<SpoilerDraft[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (authChecked && !loggedIn) {
      router.replace("/login");
    }
  }, [authChecked, loggedIn, router]);

  useEffect(() => {
    if (!slug || !loggedIn) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [bookData, tags] = await Promise.all([
          api.get<BookDetail>(`/books/${slug}`),
          api.get<MoodTag[]>("/reviews/mood-tags").catch<MoodTag[]>(() => []),
        ]);
        if (cancelled) return;
        setBook(bookData);
        setMoodTags(tags ?? []);

        // An existing review for this book turns the page into an edit form.
        const mine = await api
          .get<MyReview[]>("/reviews/me")
          .catch<MyReview[]>(() => []);
        if (cancelled) return;

        const existing = (mine ?? []).find((r) => r.book_id === bookData.id);
        if (!existing) return;

        setReviewId(existing.id);
        setReviewType(normalizeType(existing.review_type));
        setBody(existing.body);
        setIsPublic(existing.is_public);
        setSelectedTagIds(existing.mood_tags.map((t) => t.id));

        // Spoiler text isn't part of the review payload — each block's content
        // only comes back from the reveal endpoint, one request per block.
        if (existing.spoiler_blocks.length > 0) {
          const drafts = await Promise.all(
            existing.spoiler_blocks.map(async (block) => {
              try {
                const revealed = await api.get<{ content: string }>(
                  `/reviews/spoiler/${block.id}/reveal`,
                );
                return {
                  uid: nextUid(),
                  content: revealed.content,
                  severity: block.severity,
                };
              } catch {
                return { uid: nextUid(), content: "", severity: block.severity };
              }
            }),
          );
          if (cancelled) return;
          setSpoilers(drafts);
          setSpoilerWarning(drafts.some((d) => d.content === ""));
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load this book.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, loggedIn]);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  function addSpoiler() {
    setSpoilers((prev) => [
      ...prev,
      { uid: nextUid(), content: "", severity: "major" },
    ]);
  }

  function updateSpoiler(uid: number, patch: Partial<Omit<SpoilerDraft, "uid">>) {
    setSpoilers((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, ...patch } : s)),
    );
  }

  function removeSpoiler(uid: number) {
    setSpoilers((prev) => prev.filter((s) => s.uid !== uid));
    setSpoilerWarning(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!book) return;

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setSubmitError("Add a few words before publishing.");
      return;
    }
    if (trimmedBody.length > BODY_MAX) {
      setSubmitError(
        `Reviews are limited to ${BODY_MAX.toLocaleString()} characters.`,
      );
      return;
    }

    const blocks = spoilers.map((s) => ({
      content: s.content.trim(),
      severity: s.severity,
    }));
    if (blocks.some((b) => !b.content)) {
      setSubmitError(
        "Every spoiler section needs content — add text, or remove the empty one.",
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      book_id: book.id,
      review_type: reviewType,
      body: trimmedBody,
      is_public: isPublic,
      spoiler_blocks: blocks,
      mood_tag_ids: selectedTagIds,
    };

    try {
      if (reviewId) {
        await api.put(`/reviews/${reviewId}`, payload);
      } else {
        await api.post("/reviews", payload);
      }
      router.push(`/books/${slug}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Couldn't save your review.",
      );
      setSubmitting(false);
    }
  }

  if (!authChecked || !loggedIn) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <FormSkeleton />
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <FormSkeleton />
      </main>
    );
  }

  if (!book) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20 text-center">
        <p className="text-sm text-stone-600">
          {loadError ?? "We couldn't find that book."}
        </p>
        <Link
          href="/search"
          className="mt-6 inline-flex rounded-full bg-stone-800 px-5 py-2 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900"
        >
          Search for a book
        </Link>
      </main>
    );
  }

  const authorLine = book.authors.map((a) => a.name).join(", ");
  const editing = reviewId !== null;
  const remaining = BODY_MAX - body.length;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link
        href={`/books/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-800"
      >
        <span aria-hidden>←</span> Back to book
      </Link>

      {/* What you're reviewing */}
      <div className="mt-8 flex items-center gap-4">
        <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-amber-200 via-orange-200 to-amber-300 shadow-sm ring-1 ring-stone-900/5">
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
              className="flex h-full w-full items-center justify-center text-2xl"
            >
              📚
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            You&apos;re reviewing
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-stone-900">
            {book.title}
          </p>
          {authorLine ? (
            <p className="truncate text-sm text-stone-600">by {authorLine}</p>
          ) : null}
        </div>
      </div>

      <header className="mt-10">
        <h1 className="text-3xl font-semibold leading-tight text-stone-900 sm:text-4xl">
          {editing ? "Edit Your Review" : "Write a Review"}
        </h1>
        <p className="mt-3 text-base text-stone-600">
          Take as much room as you need. Anything spoiler-y can go behind a
          barrier further down.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-12 flex flex-col gap-14">
        {/* Review type */}
        <section>
          <SectionHeading title="What kind of review is this?" />
          <div
            role="radiogroup"
            aria-label="Review type"
            className="mt-4 grid gap-3 sm:grid-cols-3"
          >
            {REVIEW_TYPES.map((type) => {
              const active = reviewType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setReviewType(type.value)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all duration-150 ${
                    active
                      ? "border-amber-400 bg-amber-50 shadow-sm ring-2 ring-amber-400/40"
                      : "border-stone-200 bg-white/70 hover:border-stone-300 hover:bg-white"
                  }`}
                >
                  <span className="block text-sm font-semibold text-stone-900">
                    {type.label}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-stone-500">
                    {type.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Body */}
        <section>
          <label
            htmlFor="review-body"
            className="block text-lg font-semibold text-stone-900"
          >
            Your review
          </label>
          <textarea
            id="review-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={BODY_MAX}
            rows={12}
            placeholder="What did you think? Share your thoughts..."
            className="mt-4 w-full resize-y rounded-2xl border border-stone-300 bg-white px-5 py-4 text-base leading-relaxed text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-300"
          />
          <p
            className={`mt-2 text-right text-xs ${
              remaining <= 0
                ? "text-red-600"
                : remaining < 500
                  ? "text-amber-700"
                  : "text-stone-400"
            }`}
          >
            {body.length.toLocaleString()} / {BODY_MAX.toLocaleString()}
          </p>
        </section>

        {/* Spoiler blocks — the signature bit */}
        <section>
          <SectionHeading
            title="Spoiler Sections"
            hint="Add content that will be hidden behind a spoiler barrier. Readers choose whether to reveal it."
          />

          {spoilerWarning ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              Some spoiler text couldn&apos;t be loaded. Re-enter it below, or
              remove those sections before updating.
            </p>
          ) : null}

          {spoilers.length > 0 ? (
            <ul className="mt-5 flex flex-col gap-4">
              {spoilers.map((spoiler, index) => (
                <li
                  key={spoiler.uid}
                  className="rounded-2xl border border-stone-200 bg-white/70 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Spoiler {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSpoiler(spoiler.uid)}
                      className="rounded-full px-2.5 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>

                  <textarea
                    value={spoiler.content}
                    onChange={(e) =>
                      updateSpoiler(spoiler.uid, { content: e.target.value })
                    }
                    rows={4}
                    aria-label={`Spoiler ${index + 1} content`}
                    placeholder="What happens? This stays hidden until a reader chooses to reveal it."
                    className="mt-3 w-full resize-y rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm leading-relaxed text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-300"
                  />

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-xs font-medium text-stone-500">
                      How big a spoiler?
                    </span>
                    <div
                      role="radiogroup"
                      aria-label={`Spoiler ${index + 1} severity`}
                      className="flex flex-wrap gap-1.5"
                    >
                      {SEVERITIES.map((severity) => {
                        const active = spoiler.severity === severity.value;
                        return (
                          <button
                            key={severity.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() =>
                              updateSpoiler(spoiler.uid, {
                                severity: severity.value,
                              })
                            }
                            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-all duration-150 ${
                              active
                                ? `${severity.active} shadow-sm`
                                : "bg-white text-stone-600 ring-stone-300 hover:bg-stone-50 hover:text-stone-900"
                            }`}
                          >
                            {severity.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={addSpoiler}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-dashed border-stone-300 bg-white/60 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400 hover:bg-white hover:text-stone-900"
          >
            + Add Spoiler Block
          </button>
        </section>

        {/* Mood tags */}
        <section>
          <SectionHeading
            title="How did it feel?"
            hint="Pick any moods that fit. These help other readers find the right book for the right night."
          />
          {moodTags.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No mood tags available right now.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {moodTags.map((tag) => {
                const active = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleTag(tag.id)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-all duration-150 ${
                      active
                        ? "bg-amber-400 text-stone-900 shadow-sm ring-amber-500/40"
                        : "bg-white/70 text-stone-600 ring-stone-200 hover:bg-amber-50 hover:text-stone-900"
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Privacy */}
        <section>
          <label className="flex cursor-pointer items-start gap-3">
            <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-stone-300 transition-colors peer-checked:bg-amber-400 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 peer-focus-visible:ring-offset-2" />
              <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 peer-checked:translate-x-5" />
            </span>
            <span>
              <span className="block text-sm font-medium text-stone-900">
                Make this review public
              </span>
              <span className="mt-0.5 block text-sm text-stone-600">
                Public reviews appear on the book&apos;s page. Turn this off to
                keep it just for you.
              </span>
            </span>
          </label>
        </section>

        {submitError ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 pt-8">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-stone-800 px-6 py-2.5 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? editing
                ? "Updating…"
                : "Publishing…"
              : editing
                ? "Update Review"
                : "Publish Review"}
          </button>
          <Link
            href={`/books/${slug}`}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      {hint ? (
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-stone-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center gap-4">
        <div className="aspect-[2/3] w-16 animate-pulse rounded-lg bg-stone-200/70" />
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 animate-pulse rounded bg-stone-200/70" />
          <div className="h-5 w-48 animate-pulse rounded bg-stone-200/70" />
          <div className="h-3 w-32 animate-pulse rounded bg-stone-200/70" />
        </div>
      </div>
      <div className="h-10 w-64 animate-pulse rounded bg-stone-200/70" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-20 animate-pulse rounded-2xl bg-stone-200/70" />
        <div className="h-20 animate-pulse rounded-2xl bg-stone-200/70" />
        <div className="h-20 animate-pulse rounded-2xl bg-stone-200/70" />
      </div>
      <div className="h-56 w-full animate-pulse rounded-2xl bg-stone-200/70" />
    </div>
  );
}
