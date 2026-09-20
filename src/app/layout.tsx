import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Headings. `opsz` lets the browser optically size it automatically; `SOFT`
// and `WONK` are what globals.css dials in for the warm, bookish feel.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  title: "Foxleaf — Your Reading Community",
  description:
    "Track, rate, discover, and discuss books with readers who share your taste.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      {/* Background and text colour come from the base layer in globals.css,
          so they re-theme with the tokens instead of being pinned here. */}
      <body className="flex min-h-full flex-col font-sans">
        {/* First focusable thing on the page: lets keyboard and switch users
            jump past the nav instead of tabbing through it on every route.
            Off-screen until focused (see the `skip-link` utility). */}
        <a
          href="#main-content"
          className="skip-link rounded-control bg-foxleaf-primary px-4 py-2 text-small font-medium text-foxleaf-primary-fg shadow-lift"
        >
          Skip to main content
        </a>
        <Navbar />
        {/* tabIndex={-1} makes this a valid target for the skip link: without
            it the browser moves the scroll position but not keyboard focus. */}
        <div
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col pt-2 focus:outline-none"
        >
          {children}
        </div>
      </body>
    </html>
  );
}
