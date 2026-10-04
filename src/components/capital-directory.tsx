"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { fundById, funds } from "@/lib/funds";
import type { Fund } from "@/lib/types";

const kinds = ["All", "Litigation funder", "Hedge fund", "Impact desk"] as const;
type Kind = (typeof kinds)[number];

const labels: Record<Kind, string> = {
  All: "All",
  "Litigation funder": "Litigation",
  "Hedge fund": "Hedge",
  "Impact desk": "Impact",
};

export function CapitalDirectory({
  selectedId = null,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const [localId, setLocalId] = useState<string | null>(null);
  const openId = onSelect ? selectedId : localId;
  const select = onSelect ?? setLocalId;
  const [kind, setKind] = useState<Kind>("All");
  const rows = useMemo(
    () => (kind === "All" ? funds : funds.filter((fund) => fund.kind === kind)),
    [kind],
  );
  const open = openId ? fundById(openId) : null;

  if (open && openId && funds.some((fund) => fund.id === openId)) {
    return <InvestorSummary fund={open} onBack={() => select(null)} />;
  }

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
      <ul className="mt-4">
        {rows.map((fund) => (
          <li key={fund.id}>
            <button
              type="button"
              className="w-full cursor-pointer rounded-xl px-2 py-5 text-left hover:bg-elevated"
              onClick={() => select(fund.id)}
            >
              <span className="flex items-baseline justify-between gap-4">
                <span className="font-serif text-xl text-paper">{fund.name}</span>
                <span className="shrink-0 text-[13px] tabular-nums text-muted">
                  {money(fund.checkMin)}–{money(fund.checkMax)}
                </span>
              </span>
              <span className="mt-1 block text-[13px] text-faint">
                {fund.kind} · {fund.city}
              </span>
              <span className="mt-2 block text-sm leading-relaxed text-muted">{fund.thesis}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InvestorSummary({ fund, onBack }: { fund: Fund; onBack: () => void }) {
  const { profile } = fund;
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <button type="button" onClick={onBack} className="cursor-pointer text-sm text-faint hover:text-gold">
        Investors
      </button>
      <p className="mt-6 text-[13px] font-medium text-gold">{fund.kind}</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">{fund.name}</h1>
      <p className="mt-2 text-sm text-muted">{fund.city}</p>
      <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-line py-4">
        <Fact term="Check" value={`${money(fund.checkMin)}–${money(fund.checkMax)}`} />
        <Fact term="Book" value={fund.aum} />
        <Fact term="Read" value={fund.readTime} />
      </dl>
      <Section title="Who they are" body={profile.who} />
      <Section title="The book" body={profile.book} />
      <Section title="What they look for" body={profile.looksFor} />
      <Section title="What they pass" body={profile.passes} />
      <Section title="How they read" body={profile.read} />
      <p className="mt-10 text-[13px] leading-relaxed text-faint">
        A demonstration profile for this desk. Not an offer, and not a recommendation to send a matter.
      </p>
    </article>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-[0.14em] text-faint uppercase">{term}</dt>
      <dd className="mt-1 text-sm tabular-nums text-paper">{value}</dd>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-8">
      <h2 className="text-[13px] font-medium text-paper">{title}</h2>
      <p className="mt-2 text-[15px] leading-7 text-muted">{body}</p>
    </section>
  );
}
