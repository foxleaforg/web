"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";

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
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setChecked(true);
      return;
    }

    let cancelled = false;
    api
      .get<Me>("/auth/me", token)
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
    <nav className="sticky top-0 z-10 border-b border-stone-200 bg-amber-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="text-lg font-semibold text-stone-900 hover:text-stone-700"
        >
          <span aria-hidden>🦊🍃</span> Foxleaf
        </Link>

        <div className="flex items-center gap-2 text-sm">
          {!checked ? null : user ? (
            <>
              <NavLink href="/search">Search</NavLink>
              <NavLink href="/shelves">My Shelves</NavLink>
              <NavLink href="/profile">Profile</NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 rounded-full border border-stone-300 bg-white/60 px-3 py-1.5 font-medium text-stone-700 transition-colors hover:bg-white"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <NavLink href="/login">Log In</NavLink>
              <Link
                href="/register"
                className="rounded-full bg-stone-800 px-4 py-1.5 font-medium text-amber-50 transition-colors hover:bg-stone-900"
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
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 font-medium text-stone-700 transition-colors hover:bg-stone-200/60 hover:text-stone-900"
    >
      {children}
    </Link>
  );
}
