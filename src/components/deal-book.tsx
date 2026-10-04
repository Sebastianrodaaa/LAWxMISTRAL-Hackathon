"use client";

import Link from "next/link";
import { useState } from "react";
import { money, multiple } from "@/lib/format";
import { runModel } from "@/lib/model";
import { useStore } from "@/lib/store";
import { ReadingAs } from "./reading-as";

export function DealBook({ onOpen }: { onOpen?: (id: string) => void }) {
  const { book, deliveries, fundId } = useStore();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const rows = book.filter((matter) => {
    if (!needle) return true;
    const hay = `${matter.title} ${matter.ngo} ${matter.caption} ${matter.tags.join(" ")} ${matter.jurisdiction}`.toLowerCase();
    return hay.includes(needle);
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Filter pitches"
          placeholder="Filter"
          className="h-11 min-w-0 flex-1 rounded-xl border border-transparent bg-elevated px-3 text-sm text-paper outline-none placeholder:text-faint focus:border-gold"
        />
        <div className="sm:w-64">
          <ReadingAs labeled={false} />
        </div>
      </div>
      {rows.length ? (
        <ul className="mt-4 divide-y divide-line">
          {rows.map((matter) => {
            const sent = deliveries.some((item) => item.matterId === matter.id && item.fundId === fundId);
            const meta = `${money(matter.assumptions.fundingAsk)} · ${multiple(runModel(matter.assumptions).moic)}`;
            const body = (
              <>
                <span className="min-w-0">
                  <span className="block text-[13px] text-muted">{matter.ngo}</span>
                  <span className="mt-0.5 block text-paper">{matter.title}</span>
                </span>
                <span className="shrink-0 text-right text-[13px] tabular-nums text-faint">
                  {meta}
                  {sent ? <span className="mt-0.5 block text-gold">Sent</span> : null}
                </span>
              </>
            );
            return (
              <li key={matter.id}>
                {onOpen ? (
                  <button
                    type="button"
                    onClick={() => onOpen(matter.id)}
                    className="flex w-full cursor-pointer items-baseline justify-between gap-6 py-4 text-left hover:text-gold"
                  >
                    {body}
                  </button>
                ) : (
                  <Link
                    href={`/book/${matter.id}`}
                    className="flex cursor-pointer items-baseline justify-between gap-6 py-4 hover:text-gold"
                  >
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-10 text-sm text-muted">No pitches match.</p>
      )}
    </div>
  );
}
