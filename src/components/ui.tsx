import type { ReactNode } from "react";

export const primaryLink =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 bg-gold px-4 text-sm font-bold text-ink transition-colors duration-200 hover:bg-gold-2";

export const secondaryLink =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 border border-line px-4 text-sm font-bold text-paper transition-colors duration-200 hover:border-gold";

export function Kicker({ n, children }: { n?: string; children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
      {n ? <span className="mr-2 text-faint">{n}</span> : null}
      {children}
    </p>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-11 w-full border border-line bg-ink px-3 text-sm text-paper outline-none transition-colors duration-200 placeholder:text-faint focus:border-gold";
