"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { money } from "@/lib/format";
import { library } from "@/lib/library";
import { useStore } from "@/lib/store";
import type { Matter } from "@/lib/types";

const filters = ["All", "Drafts", "Book"] as const;
type Filter = (typeof filters)[number];

export function DeskHome({ onOpen }: { onOpen?: (id: string) => void }) {
  const { drafts } = useStore();
  const [filter, setFilter] = useState<Filter>("All");
  const rows = useMemo(() => {
    const unlisted = drafts.filter((matter) => !matter.shared);
    const circulating = [...library, ...drafts.filter((matter) => matter.shared)];
    if (filter === "Drafts") return unlisted;
    if (filter === "Book") return circulating;
    return [...unlisted, ...circulating];
  }, [drafts, filter]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <div className="flex gap-1" role="tablist" aria-label="Pitch status">
        {filters.map((option) => {
          const active = option === filter;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(option)}
              className={`h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium ${
                active ? "bg-paper text-white" : "text-muted hover:bg-elevated"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {rows.length ? (
        <ul className="mt-4 divide-y divide-line">
          {rows.map((matter) => (
            <li key={matter.id}>
              <MatterLink
                href={`/desk/cases/${matter.id}`}
                onClick={onOpen ? () => onOpen(matter.id) : undefined}
                className="block w-full cursor-pointer py-5 text-left"
              >
                <PitchRow matter={matter} />
              </MatterLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted">No drafts.</p>
      )}
    </div>
  );
}

function PitchRow({ matter }: { matter: Matter }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl text-paper">{matter.title}</h2>
        <p className="shrink-0 text-[13px] tabular-nums text-muted">{money(matter.assumptions.fundingAsk)}</p>
      </div>
      <p className="mt-1 text-[13px] text-faint">
        {matter.ngo} · {matter.jurisdiction}
        {matter.shared ? "" : " · Draft"}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{matter.summary}</p>
    </>
  );
}

function MatterLink({
  href,
  onClick,
  className,
  children,
}: {
  href: string;
  onClick?: () => void;
  className: string;
  children: ReactNode;
}) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
