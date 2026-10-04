"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const onDesk = path.startsWith("/desk");
  const onBook = path.startsWith("/book");

  if (onDesk || onBook) {
    return <div className="h-dvh overflow-hidden">{children}</div>;
  }

  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-fill focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <header className="chrome sticky top-0 z-30">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5 md:px-6">
          <Link href="/" className="text-[1.35rem] leading-none font-semibold tracking-[-0.03em] text-paper">
            Atrium
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2 text-sm" aria-label="Primary">
            <div className="flex items-center gap-0.5 rounded-full bg-elevated p-1">
              <Link href="/desk" className="cursor-pointer rounded-full px-3 py-1.5 font-medium text-muted transition-colors duration-200 hover:text-paper">
                For NGOs
              </Link>
              <Link href="/book" className="cursor-pointer rounded-full px-3 py-1.5 font-medium text-muted transition-colors duration-200 hover:text-paper">
                For capital
              </Link>
            </div>
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
