"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookCard } from "@/components/BookCard";
import { Fox } from "@/components/Fox";
import { Badge, Button } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

type LocalAuthor = {
  id: string;
  name: string;
  slug: string;
};

type LocalBook = {
  id: string;
  title: string;
  slug: string;
  cover_url?: string | null;
  page_count?: number | null;
  first_published?: number | null;
  authors: LocalAuthor[];
};

type LocalResult = {
  book: LocalBook;
  source: "local";
};

type OpenLibraryResult = {
  ol_work_key: string;
  title: string;
  authors: string[];
  cover_url?: string | null;
  page_count?: number | null;
  first_publish_year?: number | null;
  subjects?: string[];
};

type SearchResponse = {
  local_results: LocalResult[];
  open_library_results: OpenLibraryResult[];
  query: string;
  /**
   * False when the API could not reach Open Library. Without this an empty
   * `open_library_results` is ambiguous — "no matches" and "the upstream
   * timed out" look identical, and we used to report the outage as
   * "nothing turned up", which sent people off to re-spell a fine query.
   * Optional so an older API that omits it is treated as healthy.
   */
  open_library_ok?: boolean;
};

const DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<Record<string, LocalBook>>({});
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [lastQuery, setLastQuery] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < MIN_QUERY_LEN) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setLastQuery(trimmed);

    try {
      const data = await apiFetch<SearchResponse>(
        `/books/search/combined?q=${encodeURIComponent(trimmed)}`,
        { method: "GET", signal: controller.signal },
      );
      if (!controller.signal.aborted) {
        setResults(data);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Search failed.");
      setResults(null);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LEN) {
      abortRef.current?.abort();
      setResults(null);
      setError(null);
      setLoading(false);
      setLastQuery("");
      return;
    }
    const handle = setTimeout(() => {
      runSearch(trimmed);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function handleImport(book: OpenLibraryResult) {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    setImporting((s) => ({ ...s, [book.ol_work_key]: true }));
    try {
      // Search results give authors as bare names; the import endpoint wants
      // {name, ol_key} objects. Search has no per-author keys, and the backend
      // treats an empty ol_key as "look this author up by name instead".
      const payload = {
        ol_work_key: book.ol_work_key,
        title: book.title,
        authors: book.authors.map((name) => ({ name, ol_key: "" })),
        cover_url: book.cover_url ?? null,
        page_count: book.page_count ?? null,
        first_publish_year: book.first_publish_year ?? null,
        isbn: null,
      };

      const newBook = await apiFetch<LocalBook>(
        "/books/import/open-library",
        { method: "POST", body: payload },
      );
      setImported((s) => ({ ...s, [book.ol_work_key]: newBook }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting((s) => {
        const next = { ...s };
        delete next[book.ol_work_key];
        return next;
      });
    }
  }

  const localResults = results?.local_results ?? [];
  const olResults = results?.open_library_results ?? [];
  const hasLocal = localResults.length > 0;
  const hasOL = olResults.length > 0;
  const hasAnyResults = hasLocal || hasOL;
  // `!== false` so a response without the field counts as healthy.
  const olDegraded = results !== null && results.open_library_ok === false;
  const showEmptyForQuery =
    !loading &&
    !error &&
    results !== null &&
    !hasAnyResults &&
    !olDegraded &&
    lastQuery;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-h1">Find your next read</h1>
        <p className="text-body-lg mt-3 text-foxleaf-muted text-balance">
          Search millions of books by title, author, or ISBN.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          runSearch(query);
        }}
        role="search"
        className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <label htmlFor="book-search" className="sr-only">
            Search for a book
          </label>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-foxleaf-muted"
          >
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m12.8 12.8 4 4" strokeLinecap="round" />
          </svg>
          <input
            id="book-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try “Piranesi”, “Le Guin”, or an ISBN…"
            autoFocus
            // Results appear below without a navigation, so tell screen
            // readers this field drives a live region.
            aria-controls="search-results"
            className="text-body h-14 w-full rounded-control border border-foxleaf-border-strong bg-foxleaf-surface pr-4 pl-12 text-foxleaf-ink shadow-soft transition-[border-color] duration-150 ease-out placeholder:text-foxleaf-placeholder hover:border-foxleaf-ink focus:border-foxleaf-primary"
          />
        </div>
        <Button type="submit" size="lg" className="sm:w-32">
          Search
        </Button>
      </form>

      {error ? (
        <p
          role="alert"
          className="text-small mx-auto mt-6 max-w-2xl rounded-control border border-foxleaf-danger bg-foxleaf-danger-tint px-4 py-3 text-foxleaf-danger-tint-fg"
        >
          {error}
        </p>
      ) : null}

      <div
        id="search-results"
        aria-live="polite"
        aria-busy={loading}
        className="mt-12"
      >
        {loading ? (
          <LoadingState query={query.trim()} />
        ) : !lastQuery && !query ? (
          <InitialEmpty />
        ) : showEmptyForQuery ? (
          <NoResults query={lastQuery} />
        ) : hasAnyResults || olDegraded ? (
          <div className="flex flex-col gap-14">
            {olDegraded ? (
              <OpenLibraryUnavailable onRetry={() => runSearch(lastQuery)} />
            ) : null}

            {hasLocal ? (
              <Section title="In Foxleaf" count={localResults.length}>
                <Grid>
                  {localResults.map(({ book }) => (
                    <BookCard
                      key={book.id}
                      slug={book.slug}
                      title={book.title}
                      authors={book.authors.map((a) => a.name)}
                      coverUrl={book.cover_url}
                      pageCount={book.page_count}
                      year={book.first_published}
                    />
                  ))}
                </Grid>
              </Section>
            ) : null}

            {hasOL ? (
              <Section
                title="From Open Library"
                count={olResults.length}
                hint="Not in Foxleaf yet — add one to start tracking it."
              >
                <Grid>
                  {olResults.map((book) => {
                    const importedBook = imported[book.ol_work_key];
                    const isImporting = importing[book.ol_work_key];

                    if (importedBook) {
                      return (
                        <BookCard
                          key={book.ol_work_key}
                          slug={importedBook.slug}
                          title={importedBook.title}
                          authors={importedBook.authors.map((a) => a.name)}
                          coverUrl={importedBook.cover_url}
                          pageCount={importedBook.page_count}
                          year={importedBook.first_published}
                          action={
                            <Badge
                              variant="green"
                              size="md"
                              className="w-full justify-center"
                              icon={
                                <svg
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path
                                    d="m3 8.4 3.2 3.2L13 4.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              }
                            >
                              Added
                            </Badge>
                          }
                        />
                      );
                    }

                    return (
                      <BookCard
                        key={book.ol_work_key}
                        title={book.title}
                        authors={book.authors}
                        coverUrl={book.cover_url}
                        pageCount={book.page_count}
                        year={book.first_publish_year}
                        action={
                          <Button
                            variant="outline"
                            size="sm"
                            fullWidth
                            loading={isImporting}
                            loadingLabel={`Adding ${book.title} to Foxleaf`}
                            onClick={() => handleImport(book)}
                          >
                            Add to Foxleaf
                          </Button>
                        }
                      />
                    );
                  })}
                </Grid>
              </Section>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Section({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count: number;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-h3">{title}</h2>
        <span className="text-small text-foxleaf-muted">
          {count} {count === 1 ? "book" : "books"}
        </span>
        {hint ? (
          <p className="text-small basis-full text-foxleaf-muted">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {children}
    </div>
  );
}

/**
 * Skeleton cards rather than a spinner: the layout that is about to appear,
 * warm-toned, so the page does not lurch when results land.
 */
function LoadingState({ query }: { query: string }) {
  return (
    <div>
      <p className="text-small mb-6 text-foxleaf-muted">
        Searching{query ? ` for “${query}”` : ""}…
      </p>
      <Grid>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex flex-col" aria-hidden>
            <div className="aspect-2/3 w-full rounded-card bg-foxleaf-cream-deep motion-safe:animate-pulse" />
            <div className="mt-3 h-3.5 w-4/5 rounded-full bg-foxleaf-cream-deep motion-safe:animate-pulse" />
            <div className="mt-2 h-3 w-1/2 rounded-full bg-foxleaf-cream-deep motion-safe:animate-pulse" />
          </div>
        ))}
      </Grid>
    </div>
  );
}

function InitialEmpty() {
  return (
    <div className="py-12">
      <Fox
        mood="searching"
        size="lg"
        message="What's your next read? Search a title, an author you love, or an ISBN you're holding."
      />
    </div>
  );
}

/**
 * Shown when the API reached us but could not reach Open Library. Says so
 * plainly and offers a retry, rather than implying the search found nothing.
 */
function OpenLibraryUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-col items-start gap-3 rounded-card border border-foxleaf-warning-tint-fg/25 bg-foxleaf-warning-tint px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-small text-foxleaf-warning-tint-fg">
        <span className="font-semibold">
          Couldn&apos;t reach Open Library just now.
        </span>{" "}
        Showing Foxleaf results only — there may be more books out there.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="py-12">
      <Fox
        mood="empty"
        size="lg"
        message={`Nothing turned up for “${query}”. Try a different spelling, or search by author.`}
      />
    </div>
  );
}
