import Link from "next/link";
import { Fox } from "@/components/Fox";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex max-w-xl flex-col items-center gap-6 text-center">
        {/* Purely decorative: the h1 immediately below already says
            "Foxleaf", so announcing the mascot too would just be noise. */}
        <Fox mood="reading" size="lg" decorative />

        <h1 className="text-display font-wonk">Foxleaf</h1>

        <p className="text-h4 font-sans font-normal text-foxleaf-ink">
          Your reading community
        </p>

        <p className="text-body-lg max-w-md text-foxleaf-muted">
          Track, rate, discover, and discuss books with readers who share your
          taste.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="tap-target inline-flex h-12 items-center justify-center rounded-control bg-foxleaf-primary px-6 text-small font-medium text-foxleaf-primary-fg shadow-primary transition-colors hover:bg-foxleaf-primary-hover"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="tap-target inline-flex h-12 items-center justify-center rounded-control border border-foxleaf-border-strong px-6 text-small font-medium text-foxleaf-ink transition-colors hover:border-foxleaf-primary hover:bg-foxleaf-cream-deep hover:text-foxleaf-primary"
          >
            Log In
          </Link>
        </div>
      </div>
    </main>
  );
}
