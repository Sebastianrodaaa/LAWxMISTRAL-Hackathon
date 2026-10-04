"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const deskLinks = [
  {
    href: "/desk",
    label: "Matters",
    on: (path: string) => path === "/desk" || path.startsWith("/desk/cases"),
  },
  {
    href: "/desk/new",
    label: "New folder",
    on: (path: string) => path.startsWith("/desk/new"),
  },
  {
    href: "/desk/capital",
    label: "Capital",
    on: (path: string) => path.startsWith("/desk/capital"),
  },
];

const bookLinks = [
  {
    href: "/book",
    label: "The book",
    on: (path: string) => path === "/book" || (path.startsWith("/book/") && !path.startsWith("/book/research")),
  },
  {
    href: "/book/research",
    label: "Research",
    on: (path: string) => path.startsWith("/book/research"),
  },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const onDesk = path.startsWith("/desk");
  const onBook = path.startsWith("/book");
  const links = onDesk ? deskLinks : onBook ? bookLinks : null;

  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-gold focus:px-3 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <header className="chrome sticky top-0 z-30">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5 md:px-6">
          <Link href="/" className="font-serif text-[1.7rem] leading-none tracking-tight text-paper">
            Atrium
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-1 text-sm" aria-label="Primary">
            {links ? (
              links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={link.on(path) ? "page" : undefined}
                  className={`cursor-pointer px-2.5 py-1.5 transition-colors duration-200 ${
                    link.on(path) ? "text-gold" : "text-muted hover:text-paper"
                  }`}
                >
                  {link.label}
                </Link>
              ))
            ) : (
              <>
                <Link href="/desk" className="cursor-pointer px-2.5 py-1.5 text-muted transition-colors duration-200 hover:text-paper">
                  For NGOs
                </Link>
                <Link href="/book" className="cursor-pointer px-2.5 py-1.5 text-muted transition-colors duration-200 hover:text-paper">
                  For capital
                </Link>
              </>
            )}
            {onDesk ? (
              <Link href="/book" className="cursor-pointer px-2.5 py-1.5 text-faint transition-colors duration-200 hover:text-gold">
                Switch to capital
              </Link>
            ) : null}
            {onBook ? (
              <Link href="/desk" className="cursor-pointer px-2.5 py-1.5 text-faint transition-colors duration-200 hover:text-gold">
                Switch to the desk
              </Link>
            ) : null}
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-faint md:px-6">
          Atrium is a working demonstration for a funding read. It is not a law firm, not a broker-dealer, and not an offer to sell a security. Worksheet figures are not forecasts.
        </p>
      </footer>
    </div>
  );
}
