"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookCard } from "@/components/BookCard";
import { StatusBadge, type ReadingStatus } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

type Author = { id: string; name: string; slug: string };

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

type ShelfDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shelf_type: "default" | "custom" | string;
  is_public: boolean;
  sort_order: number;
  book_count: number;
  created_at: string;
  books: ShelfBook[];
};

export default function ShelfDetailPage() {
  const params = useParams<{ shelf_slug: string }>();
  const shelfSlug = params?.shelf_slug;
  const router = useRouter();

  const [loggedIn, setLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [shelf, setShelf] = useState<ShelfDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    if (!shelfSlug || !loggedIn) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await api.get<ShelfDetail>(`/shelves/${shelfSlug}`);
        if (cancelled) return;
        setShelf(data);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load this shelf.";
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
  }, [shelfSlug, loggedIn]);

  function openEdit() {
    if (!shelf) return;
    setEditName(shelf.name);
    setEditDescription(shelf.description ?? "");
    setEditIsPublic(shelf.is_public);
    setEditError(null);
    setEditOpen(true);
  }

  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shelf) return;
    const name = editName.trim();
    if (!name) {
      setEditError("A shelf needs a name.");
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      // Sending "" rather than null so an emptied description actually clears:
      // the API treats null as "leave unchanged".
      await api.put(`/shelves/${shelf.slug}`, {
        name,
        description: editDescription.trim(),
        is_public: editIsPublic,
      });
      const fresh = await api.get<ShelfDetail>(`/shelves/${shelf.slug}`);
      setShelf(fresh);
      setEditOpen(false);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Couldn't save those changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!shelf) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/shelves/${shelf.slug}`);
      router.push("/shelves");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't delete this shelf.",
      );
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (!authChecked || !loggedIn || loading) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <ShelfSkeleton />
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <div aria-hidden className="text-5xl">
            🗂️
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">
            Shelf not found
          </h1>
          <p className="text-sm text-stone-600">
            We couldn&apos;t find a shelf at this address.
          </p>
          <Link
            href="/shelves"
            className="mt-3 rounded-full bg-stone-800 px-5 py-2 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900"
          >
            Back to My Library
          </Link>
        </div>
      </main>
    );
  }

  if (!shelf) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-20 text-center text-sm text-stone-600">
        {error ?? "Something went wrong."}
      </main>
    );
  }

  const isCustom = shelf.shelf_type !== "default";
  const bookCount = shelf.books.length;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <Link
        href="/shelves"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-800"
      >
        <span aria-hidden>←</span> Back to My Library
      </Link>

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-stone-900">
            {shelf.name}
          </h1>
          {shelf.description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
              {shelf.description}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
            <span>
              {bookCount} {bookCount === 1 ? "book" : "books"}
            </span>
            <span aria-hidden>·</span>
            <span>{shelf.is_public ? "Public" : "Private"}</span>
            {!isCustom ? (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-inset ring-stone-200">
                Default shelf
              </span>
            ) : null}
          </div>
        </div>

        {isCustom && !editOpen ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openEdit}
              className="rounded-full border border-stone-300 bg-white/70 px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        ) : null}
      </header>

      {confirmingDelete ? (
        <div className="mt-5 max-w-xl rounded-3xl border border-red-200 bg-red-50/60 p-5">
          <p className="text-sm font-medium text-stone-900">
            Delete “{shelf.name}”?
          </p>
          <p className="mt-1 text-sm text-stone-600">
            The shelf goes away, but the books stay in your library.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete shelf"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <form
          onSubmit={handleSaveEdit}
          className="mt-5 max-w-xl rounded-3xl border border-stone-200 bg-white/70 p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-shelf-name"
                className="text-sm font-medium text-stone-800"
              >
                Shelf name
              </label>
              <input
                id="edit-shelf-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
                autoFocus
                className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-300"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-shelf-description"
                className="text-sm font-medium text-stone-800"
              >
                Description{" "}
                <span className="font-normal text-stone-500">(optional)</span>
              </label>
              <textarea
                id="edit-shelf-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                placeholder="What goes on this shelf?"
                className="resize-y rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-300"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-stone-300 transition-colors peer-checked:bg-amber-400 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 peer-focus-visible:ring-offset-2" />
                <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 peer-checked:translate-x-5" />
              </span>
              <span className="text-sm font-medium text-stone-900">
                Public shelf
              </span>
            </label>

            {editError ? (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {editError}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-stone-800 px-5 py-2.5 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={saving}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <section className="mt-10">
        {shelf.books.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-stone-300 bg-white/40 py-20 text-center">
            <div aria-hidden className="text-5xl">
              🗂️
            </div>
            <p className="text-lg font-medium text-stone-800">
              This shelf is empty.
            </p>
            <p className="max-w-sm text-sm text-stone-500">
              Add books from any book&apos;s page.
            </p>
            <Link
              href="/search"
              className="mt-2 rounded-full bg-stone-800 px-5 py-2 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900"
            >
              Find a book
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {shelf.books.map((book) => (
              <BookCard
                key={book.id}
                title={book.book_title}
                authors={book.authors.map((a) => a.name)}
                coverUrl={book.book_cover_url}
                slug={book.book_slug}
                action={<StatusBadge status={book.status} />}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ShelfSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-3 w-32 animate-pulse rounded bg-stone-200/70" />
      <div className="flex flex-col gap-3">
        <div className="h-9 w-64 animate-pulse rounded bg-stone-200/70" />
        <div className="h-4 w-80 animate-pulse rounded bg-stone-200/70" />
        <div className="h-3 w-24 animate-pulse rounded bg-stone-200/70" />
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col">
            <div className="aspect-[2/3] w-full animate-pulse rounded-xl bg-stone-200/70" />
            <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-stone-200/70" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-stone-200/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
