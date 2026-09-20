"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearTokens, isLoggedIn } from "@/lib/auth";

type Me = {
  username: string;
  display_name: string;
};

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      setUser(null);
      setChecked(true);
      return;
    }

    let cancelled = false;
    api
      .get<Me>("/auth/me")
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) {
          clearTokens();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function handleLogout() {
    clearTokens();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    // `aria-label` distinguishes this landmark from any other <nav> on the
    // page, so screen reader users get "Main navigation" in the landmark list.
    <nav
      aria-label="Main"
      className="sticky top-0 z-10 border-b border-foxleaf-border bg-foxleaf-cream/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/"
          // The emoji is decorative; without aria-hidden a screen reader
          // would announce "fox leaf Foxleaf".
          aria-label="Foxleaf — home"
          className="tap-target shrink-0 rounded-control text-lg font-semibold whitespace-nowrap text-foxleaf-ink transition-colors hover:text-foxleaf-primary"
        >
          <span aria-hidden>🦊🍃</span> Foxleaf
        </Link>

        {/* Narrow screens scroll this row sideways rather than wrapping the
            links onto two ragged lines. A proper mobile menu is still to do.
            The negative margin lets it scroll flush to the viewport edge. */}
        <div className="text-small -mr-6 flex items-center gap-1 overflow-x-auto pr-6 [&>*]:shrink-0 [&_a]:whitespace-nowrap [&_button]:whitespace-nowrap">
          {!checked ? null : user ? (
            <>
              <NavLink href="/search" pathname={pathname}>
                Search
              </NavLink>
              <NavLink href="/shelves" pathname={pathname}>
                My Shelves
              </NavLink>
              <NavLink href="/profile" pathname={pathname}>
                Profile
              </NavLink>
              <NavLink href="/import" pathname={pathname}>
                Import
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="tap-target ml-1 rounded-full border border-foxleaf-border-strong px-3 py-1.5 font-medium text-foxleaf-ink transition-colors hover:border-foxleaf-primary hover:bg-foxleaf-cream-deep hover:text-foxleaf-primary"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <NavLink href="/login" pathname={pathname}>
                Log In
              </NavLink>
              <Link
                href="/register"
                className="tap-target rounded-full bg-foxleaf-primary px-4 py-1.5 font-medium text-foxleaf-primary-fg shadow-primary transition-colors hover:bg-foxleaf-primary-hover"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  pathname,
  children,
}: {
  href: string;
  pathname: string;
  children: React.ReactNode;
}) {
  const isCurrent = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      // `aria-current` tells assistive tech which page you are on; the weight
      // and underline say the same thing without relying on colour.
      aria-current={isCurrent ? "page" : undefined}
      className={
        "tap-target rounded-full px-3 py-1.5 transition-colors " +
        (isCurrent
          ? "font-semibold text-foxleaf-ink underline decoration-foxleaf-primary decoration-2 underline-offset-4"
          : "font-medium text-foxleaf-muted hover:bg-foxleaf-cream-deep hover:text-foxleaf-ink")
      }
    >
      {children}
    </Link>
  );
}
