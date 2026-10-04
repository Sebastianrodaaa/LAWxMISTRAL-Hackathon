"use client";

import { useMemo, useState } from "react";
import { sanctionBrief, sanctions } from "@/lib/sanctions";
import type { Sanction } from "@/lib/types";
import { openForwardedThread } from "@/lib/rakazo-desk";

const filters = ["All", ...new Set(sanctions.map((item) => item.authority))];

export function SanctionsFeed({
  onDiscuss,
  onDevelop,
}: {
  onDiscuss: () => void;
  onDevelop: (sanction: Sanction) => void;
}) {
  const [filter, setFilter] = useState("All");
  const rows = useMemo(
    () => (filter === "All" ? sanctions : sanctions.filter((item) => item.authority === filter)),
    [filter],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <div className="flex gap-1" role="tablist" aria-label="Sanction authority">
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
      <ul className="mt-4 divide-y divide-line">
        {rows.map((item) => (
          <li key={item.id} className="py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-serif text-2xl text-paper">{item.title}</h2>
              <p className="text-[13px] text-faint">
                {item.authority} · {item.program} · {item.status}
              </p>
            </div>
            <p className="mt-1 text-[13px] text-faint">
              Issued {item.issued} · {item.designated}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.summary}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {item.measures.map((measure) => (
                <li key={measure} className="rounded-full bg-elevated px-2.5 py-1 text-[11px] font-medium text-muted">
                  {measure}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="h-10 cursor-pointer rounded-xl bg-fill px-3 text-sm font-semibold text-white"
                onClick={() => {
                  openForwardedThread({
                    title: item.title,
                    matterId: `sanction:${item.id}`,
                    text: sanctionBrief(item),
                  });
                  onDiscuss();
                }}
              >
                Discuss with agent
              </button>
              <button
                type="button"
                className="h-10 cursor-pointer rounded-xl bg-elevated px-3 text-sm font-medium hover:bg-hover"
                onClick={() => onDevelop(item)}
              >
                Develop a pitch
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
