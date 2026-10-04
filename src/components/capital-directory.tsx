"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { money } from "@/lib/format";
import { funds } from "@/lib/funds";
import { library } from "@/lib/library";
import { rankFunds } from "@/lib/match";
import { useStore } from "@/lib/store";
import { Kicker, Tag } from "./ui";

export function CapitalDirectory() {
  const params = useSearchParams();
  const { drafts } = useStore();
  const matters = useMemo(
    () => [...drafts, ...library.filter((matter) => !drafts.some((draft) => draft.id === matter.id))],
    [drafts],
  );
  const requested = params.get("matter");
  const [matterId, setMatterId] = useState(requested && matters.some((matter) => matter.id === requested) ? requested : matters[0]?.id ?? "");
  const matter = matters.find((item) => item.id === matterId) ?? matters[0];
  const ranked = matter ? rankFunds(matter, funds) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <Kicker n="03">Capital</Kicker>
      <h1 className="mt-3 max-w-3xl font-serif text-4xl tracking-tight md:text-5xl">
        Who will read this case.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        Mandates are stated by the desks, not inferred from a pitch. The score is overlap plus whether your ask fits the check. It is not a probability they will fund.
      </p>
      <label className="mt-6 block max-w-md">
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
          Score against
        </span>
        <select
          value={matter?.id ?? ""}
          onChange={(event) => setMatterId(event.target.value)}
          className="h-11 w-full cursor-pointer border border-line bg-ink px-3 text-sm text-paper"
        >
          {matters.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
              {item.origin === "desk" ? " · your draft" : ""}
            </option>
          ))}
        </select>
      </label>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {ranked.map((match) => (
          <li key={match.fund.id} className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-2xl">{match.fund.name}</h2>
                <Tag>{match.fund.kind}</Tag>
              </div>
              <p className="mt-1 text-xs text-faint">
                {match.fund.city} · {match.fund.aum} · first read {match.fund.readTime}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{match.fund.thesis}</p>
              <ul className="mt-3 space-y-1 text-sm text-paper">
                {match.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {match.fund.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            </div>
            <div className="md:text-right">
              <p className="font-serif text-4xl text-gold tabular-nums">{match.score}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                {money(match.fund.checkMin)}–{money(match.fund.checkMax)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
