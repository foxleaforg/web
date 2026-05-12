import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex max-w-xl flex-col items-center gap-6 text-center">
        <div className="text-6xl" aria-hidden>
          🦊🍃
        </div>
        <h1 className="text-5xl font-semibold tracking-tight text-stone-900">
          Foxleaf
        </h1>
        <p className="text-xl text-stone-700">Your reading community</p>
        <p className="max-w-md text-base leading-relaxed text-stone-600">
          Track, rate, discover, and discuss books with readers who share your
          taste.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-stone-800 px-6 py-3 text-sm font-medium text-amber-50 transition-colors hover:bg-stone-900"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-stone-300 bg-white/60 px-6 py-3 text-sm font-medium text-stone-800 transition-colors hover:bg-white"
          >
            Log In
          </Link>
        </div>
      </div>
    </main>
  );
}
