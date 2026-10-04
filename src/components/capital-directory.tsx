"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { funds } from "@/lib/funds";
import type { Fund } from "@/lib/types";

const kinds = ["All", "Litigation funder", "Hedge fund", "Impact desk"] as const;
type Kind = (typeof kinds)[number];

const labels: Record<Kind, string> = {
  All: "All",
  "Litigation funder": "Litigation",
  "Hedge fund": "Hedge",
  "Impact desk": "Impact",
};

export function CapitalDirectory() {
  const [kind, setKind] = useState<Kind>("All");
  const rows = useMemo(
    () => (kind === "All" ? funds : funds.filter((fund) => fund.kind === kind)),
    [kind],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <div className="flex gap-1" role="tablist" aria-label="Fund type">
        {kinds.map((option) => {
          const active = option === kind;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setKind(option)}
              className={`h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium ${
                active ? "bg-paper text-white" : "text-muted hover:bg-elevated"
              }`}
            >
              {labels[option]}
            </button>
          );
        })}
      </div>
      <ul className="mt-4 divide-y divide-line">
        {rows.map((fund) => (
          <FundRow key={fund.id} fund={fund} />
        ))}
      </ul>
    </div>
  );
}

function FundRow({ fund }: { fund: Fund }) {
  return (
    <li className="py-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl">{fund.name}</h2>
        <p className="shrink-0 text-[13px] tabular-nums text-muted">
          {money(fund.checkMin)}–{money(fund.checkMax)}
        </p>
      </div>
      <p className="mt-1 text-[13px] text-faint">
        {fund.kind} · {fund.city}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{fund.thesis}</p>
    </li>
  );
}
