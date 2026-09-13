"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DNFReasonModal } from "@/components/DNFReasonModal";
import { StatusBadge, type ReadingStatus } from "@/components/StatusBadge";
import { StatusDropdown } from "@/components/StatusDropdown";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

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
  const [authChecked, setAuthChecked] = useState(false);

  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Custom shelf creation.
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Book awaiting a DNF reason, set once its status PUT lands.
  const [dnfBook, setDnfBook] = useState<ShelfBook | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
  }, [router]);

  // Initial load: shelves + all books.
  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [shelvesData, booksData] = await Promise.all([
          api.get<Shelf[]>("/shelves/"),
          api.get<ShelfBook[]>("/shelves/books/all"),
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
  }, [authChecked]);

  async function refreshShelves() {
    const data = await api.get<Shelf[]>("/shelves/");
    setShelves(data);
  }

  async function handleCreateShelf(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) {
      setCreateError("Give your shelf a name.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await api.post("/shelves/", {
        name,
        description: newDescription.trim() || null,
        is_public: newIsPublic,
      });
      await refreshShelves();
      setNewName("");
      setNewDescription("");
      setNewIsPublic(true);
      setCreatingOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't create that shelf.";
      // The API 409s with the slug in the message; say it in plain words.
      setCreateError(
        /already exists/i.test(message)
          ? "You already have a shelf with that name."
          : message,
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(book: ShelfBook, next: ReadingStatus) {
    const previous = book.status;
    setUpdatingId(book.id);
    // Optimistic update.
    setBooks((current) =>
      current.map((b) => (b.id === book.id ? { ...b, status: next } : b)),
    );
    try {
      await api.put(`/shelves/books/${book.book_id}/status`, { status: next });
      // The reason endpoint requires the dnf status to be committed first.
      if (next === "dnf") {
        setDnfBook({ ...book, status: next });
      }
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-stone-900">My Library</h1>
          <p className="text-sm text-stone-600">
            Every book you&apos;ve added, organized by where you are with it.
          </p>
        </div>
        {!creatingOpen ? (
          <button
            type="button"
            onClick={() => {
              setCreatingOpen(true);
              setCreateError(null);
            }}
            className="shrink-0 rounded-full bg-stone-800 px-5 py-2.5 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900"
          >
            + New Shelf
          </button>
        ) : null}
      </header>

      {/* Custom shelves sit with the library itself, not buried below it. */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Your shelves
        </h2>

        {customShelves.length > 0 ? (
          <ul className="mt-3 flex flex-wrap items-center gap-2">
            {customShelves.map((shelf) => (
              <li key={shelf.id}>
                <Link
                  href={`/shelves/${shelf.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-100/50 px-4 py-1.5 text-sm font-medium text-stone-800 transition-colors hover:border-amber-300 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  {shelf.name}
                  <span className="rounded-full bg-white/70 px-1.5 text-xs font-normal text-stone-600">
                    {shelf.book_count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : !creatingOpen ? (
          <p className="mt-3 text-sm text-stone-500">
            No shelves yet — group books however you like, by mood, year, or
            book club.
          </p>
        ) : null}

        {creatingOpen ? (
          <form
            onSubmit={handleCreateShelf}
            className="mt-4 max-w-xl rounded-3xl border border-stone-200 bg-white/70 p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="shelf-name"
                  className="text-sm font-medium text-stone-800"
                >
                  Shelf name
                </label>
                <input
                  id="shelf-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={100}
                  autoFocus
                  placeholder="e.g. Favorites, 2026 Reads, Book Club"
                  className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-300"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="shelf-description"
                  className="text-sm font-medium text-stone-800"
                >
                  Description{" "}
                  <span className="font-normal text-stone-500">(optional)</span>
                </label>
                <textarea
                  id="shelf-description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="What goes on this shelf?"
                  className="resize-y rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-300"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={newIsPublic}
                    onChange={(e) => setNewIsPublic(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="h-6 w-11 rounded-full bg-stone-300 transition-colors peer-checked:bg-amber-400 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 peer-focus-visible:ring-offset-2" />
                  <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 peer-checked:translate-x-5" />
                </span>
                <span className="text-sm font-medium text-stone-900">
                  Public shelf
                </span>
              </label>

              {createError ? (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {createError}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-full bg-stone-800 px-5 py-2.5 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? "Creating…" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingOpen(false);
                    setCreateError(null);
                  }}
                  disabled={creating}
                  className="rounded-full px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </section>

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

      {dnfBook ? (
        <DNFReasonModal
          bookId={dnfBook.book_id}
          bookTitle={dnfBook.book_title}
          isOpen
          onClose={() => setDnfBook(null)}
        />
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
