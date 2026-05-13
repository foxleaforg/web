"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge, type ReadingStatus } from "@/components/StatusBadge";
import { StatusDropdown } from "@/components/StatusDropdown";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type Author = {
  id: string;
  name: string;
  slug: string;
};

type ShelfBook = {
  id: string;
  book_id: string;
  book_title: string;
  book_slug: string;
  book_cover_url: string | null;
  authors: Author[];
  status: ReadingStatus;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

type Shelf = {
  id: string;
  name: string;
  slug: string;
  shelf_type: "default" | "custom" | string;
  is_public: boolean;
  sort_order: number;
  book_count: number;
  created_at: string;
};

type Filter = "all" | ReadingStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reading", label: "Reading" },
  { value: "want_to_read", label: "Want to Read" },
  { value: "read", label: "Read" },
  { value: "dnf", label: "Did Not Finish" },
];

export default function ShelvesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const t = getAccessToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    setToken(t);
    setAuthChecked(true);
  }, [router]);

  // Initial load: shelves + all books.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [shelvesData, booksData] = await Promise.all([
          api.get<Shelf[]>("/shelves/", token),
          api.get<ShelfBook[]>("/shelves/books/all", token),
        ]);
        if (cancelled) return;
        setShelves(shelvesData);
        setBooks(booksData);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load your library.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleStatusChange(book: ShelfBook, next: ReadingStatus) {
    if (!token) return;
    const previous = book.status;
    setUpdatingId(book.id);
    // Optimistic update.
    setBooks((current) =>
      current.map((b) => (b.id === book.id ? { ...b, status: next } : b)),
    );
    try {
      await api.put(
        `/shelves/books/${book.book_id}/status`,
        { status: next },
        token,
      );
    } catch (err) {
      // Revert.
      setBooks((current) =>
        current.map((b) =>
          b.id === book.id ? { ...b, status: previous } : b,
        ),
      );
      setError(
        err instanceof Error ? err.message : "Couldn't update status.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      all: books.length,
      reading: 0,
      want_to_read: 0,
      read: 0,
      dnf: 0,
    };
    for (const book of books) {
      result[book.status] = (result[book.status] ?? 0) + 1;
    }
    return result;
  }, [books]);

  const visibleBooks = useMemo(
    () =>
      filter === "all" ? books : books.filter((b) => b.status === filter),
    [books, filter],
  );

  const customShelves = useMemo(
    () => shelves.filter((s) => s.shelf_type !== "default"),
    [shelves],
  );

  if (!authChecked) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <LoadingState label="Loading…" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-stone-900">My Library</h1>
        <p className="text-sm text-stone-600">
          Every book you&apos;ve added, organized by where you are with it.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const count = counts[f.value] ?? 0;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-stone-900 text-amber-50"
                  : "border border-stone-300 bg-white/60 text-stone-700 hover:bg-white"
              }`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 text-xs ${
                  active
                    ? "bg-amber-50/20 text-amber-50"
                    : "bg-stone-200 text-stone-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <section className="mt-10">
        {loading ? (
          <BookGridSkeleton />
        ) : books.length === 0 ? (
          <EmptyLibrary />
        ) : visibleBooks.length === 0 ? (
          <EmptyFilter />
        ) : (
          <Grid>
            {visibleBooks.map((book) => (
              <ShelfBookCard
                key={book.id}
                book={book}
                updating={updatingId === book.id}
                onStatusChange={(next) => handleStatusChange(book, next)}
              />
            ))}
          </Grid>
        )}
      </section>

      {customShelves.length > 0 ? (
        <section className="mt-16 border-t border-stone-200 pt-10">
          <h2 className="text-lg font-semibold text-stone-900">
            Your Shelves
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Custom collections you&apos;ve created.
          </p>
          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customShelves.map((shelf) => (
              <li key={shelf.id}>
                <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white/70 px-4 py-3 transition-colors hover:bg-white">
                  <span className="font-medium text-stone-900">
                    {shelf.name}
                  </span>
                  <span className="text-xs text-stone-500">
                    {shelf.book_count}{" "}
                    {shelf.book_count === 1 ? "book" : "books"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function ShelfBookCard({
  book,
  updating,
  onStatusChange,
}: {
  book: ShelfBook;
  updating: boolean;
  onStatusChange: (next: ReadingStatus) => void;
}) {
  const dateLine = (() => {
    if (book.status === "reading" && book.started_at) {
      return `Started ${formatDate(book.started_at)}`;
    }
    if (book.status === "read" && book.finished_at) {
      return `Finished ${formatDate(book.finished_at)}`;
    }
    return null;
  })();

  return (
    <div className="flex h-full flex-col">
      <Link
        href={`/books/${book.book_slug}`}
        className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-amber-200 via-orange-200 to-amber-300 shadow-sm ring-1 ring-stone-900/5 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
          {book.book_cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.book_cover_url}
              alt={`Cover of ${book.book_title}`}
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
          <div className="absolute left-2 top-2">
            <StatusBadge status={book.status} />
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-0.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-stone-900">
            {book.book_title}
          </h3>
          {book.authors.length > 0 ? (
            <p className="line-clamp-1 text-sm text-stone-600">
              {book.authors.map((a) => a.name).join(", ")}
            </p>
          ) : null}
          {dateLine ? (
            <p className="mt-0.5 text-xs text-stone-500">{dateLine}</p>
          ) : null}
        </div>
      </Link>
      <div className="mt-3">
        <StatusDropdown
          status={book.status}
          onChange={onStatusChange}
          disabled={updating}
        />
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {children}
    </div>
  );
}

function BookGridSkeleton() {
  return (
    <Grid>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex flex-col">
          <div className="aspect-[2/3] w-full animate-pulse rounded-xl bg-stone-200/70" />
          <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-stone-200/70" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-stone-200/70" />
        </div>
      ))}
    </Grid>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-sm text-stone-500">
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className="h-3 w-3 animate-pulse rounded-full bg-stone-400"
        />
        {label}
      </span>
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-stone-300 bg-white/40 py-20 text-center">
      <div aria-hidden className="text-5xl">
        📚✨
      </div>
      <p className="text-lg font-medium text-stone-800">
        Your library is empty!
      </p>
      <p className="max-w-sm text-sm text-stone-500">
        Start by searching for books to add.
      </p>
      <Link
        href="/search"
        className="mt-2 rounded-full bg-stone-800 px-5 py-2 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900"
      >
        Find a book
      </Link>
    </div>
  );
}

function EmptyFilter() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-stone-300 bg-white/40 py-16 text-center">
      <div aria-hidden className="text-3xl">
        🍃
      </div>
      <p className="text-base text-stone-700">
        No books with this status yet.
      </p>
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
