"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookCard } from "@/components/BookCard";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

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
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }
    setImporting((s) => ({ ...s, [book.ol_work_key]: true }));
    try {
      const newBook = await apiFetch<LocalBook>(
        "/books/import/open-library",
        { method: "POST", body: book, token },
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
  const showEmptyForQuery =
    !loading && !error && results !== null && !hasAnyResults && lastQuery;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          runSearch(query);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
          >
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a book, author, or ISBN…"
            autoFocus
            className="w-full rounded-full border border-stone-300 bg-white py-4 pl-12 pr-4 text-base text-stone-900 shadow-sm outline-none transition-colors placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-300"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-stone-800 px-6 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900"
        >
          Search
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-10">
        {loading ? (
          <LoadingState />
        ) : !lastQuery && !query ? (
          <InitialEmpty />
        ) : showEmptyForQuery ? (
          <NoResults query={lastQuery} />
        ) : hasAnyResults ? (
          <div className="flex flex-col gap-12">
            {hasLocal ? (
              <Section title="In Foxleaf">
                <Grid>
                  {localResults.map(({ book }) => (
                    <Link
                      key={book.id}
                      href={`/books/${book.slug}`}
                      className="block cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
                    >
                      <BookCard
                        title={book.title}
                        authors={book.authors.map((a) => a.name)}
                        coverUrl={book.cover_url}
                        pageCount={book.page_count}
                        year={book.first_published}
                      />
                    </Link>
                  ))}
                </Grid>
              </Section>
            ) : null}

            {hasOL ? (
              <Section title="From Open Library">
                <Grid>
                  {olResults.map((book) => {
                    const importedBook = imported[book.ol_work_key];
                    const isImporting = importing[book.ol_work_key];
                    if (importedBook) {
                      return (
                        <Link
                          key={book.ol_work_key}
                          href={`/books/${importedBook.slug}`}
                          className="block cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
                        >
                          <BookCard
                            title={importedBook.title}
                            authors={importedBook.authors.map((a) => a.name)}
                            coverUrl={importedBook.cover_url}
                            pageCount={importedBook.page_count}
                            year={importedBook.first_published}
                            action={
                              <span className="block w-full rounded-full bg-green-100 px-3 py-1.5 text-center text-xs font-medium text-green-800">
                                Added ✓
                              </span>
                            }
                          />
                        </Link>
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
                          <button
                            type="button"
                            onClick={() => handleImport(book)}
                            disabled={isImporting}
                            className="w-full rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isImporting ? "Adding…" : "Add to Foxleaf"}
                          </button>
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-5 text-lg font-semibold text-stone-900">{title}</h2>
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

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20 text-sm text-stone-500">
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className="h-3 w-3 animate-pulse rounded-full bg-stone-400"
        />
        Searching…
      </span>
    </div>
  );
}

function InitialEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="text-5xl" aria-hidden>
        📖✨
      </div>
      <p className="text-lg font-medium text-stone-800">
        What are you looking for?
      </p>
      <p className="max-w-sm text-sm text-stone-500">
        Search by title, author, or ISBN to find your next read.
      </p>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="text-4xl" aria-hidden>
        🔍
      </div>
      <p className="text-base text-stone-700">
        No books found for{" "}
        <span className="font-medium text-stone-900">“{query}”</span>.
      </p>
      <p className="text-sm text-stone-500">Try a different search.</p>
    </div>
  );
}
