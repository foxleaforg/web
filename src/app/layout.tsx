import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-amber-50 text-stone-800 font-sans">
        <Navbar />
        <div className="flex flex-1 flex-col pt-2">{children}</div>
      </body>
    </html>
  );
}
