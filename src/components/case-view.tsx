"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Deck } from "@/components/deck";
import { money } from "@/lib/format";
import { funds, fundById } from "@/lib/funds";
import { rankFunds } from "@/lib/match";
import { useStore } from "@/lib/store";
import { Kicker, Tag, primaryLink, secondaryLink } from "./ui";

export function CaseView({
  matterId,
  onBack,
  onInvestors,
}: {
  matterId?: string;
  onBack?: () => void;
  onInvestors?: () => void;
}) {
  const params = useParams<{ id: string }>();
  const { getMatter, ready, interests, listMatter } = useStore();
  const matter = getMatter(matterId || params.id);

  if (!matter && !ready) {
    return <p className="px-6 py-16 text-muted">Opening the matter…</p>;
  }
  if (!matter) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <h1 className="font-serif text-4xl">This matter is not on the desk.</h1>
        <Link href="/desk" className="mt-6 inline-block text-gold">
          Back to matters
        </Link>
      </div>
    );
  }

  const matches = rankFunds(matter, funds).slice(0, 3);
  const notes = interests.filter((item) => item.matterId === matter.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      {onBack ? (
        <button type="button" onClick={onBack} className="cursor-pointer text-sm text-faint hover:text-gold">
          Matters
        </button>
      ) : (
        <Link href="/desk" className="text-sm text-faint hover:text-gold">
          Matters
        </Link>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Tag>{matter.origin === "desk" ? (matter.shared ? "On the book" : "Draft") : "Circulating"}</Tag>
        <Tag>{matter.stage}</Tag>
      </div>
      <h1 className="mt-3 max-w-3xl font-serif text-4xl tracking-tight md:text-5xl">{matter.title}</h1>
      <p className="mt-2 text-sm text-muted">
        {matter.ngo} · {matter.jurisdiction} · {matter.counsel}
      </p>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <Deck slides={matter.slides} />
          {matter.gaps.length ? (
            <p className="mt-4 text-sm text-warn">
              The folder did not state: {matter.gaps.join(", ")}. Those slides say so.
            </p>
          ) : null}
        </div>
        <aside className="space-y-6">
          <div className="surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Ask</p>
            <p className="mt-1 font-serif text-4xl text-gold tabular-nums">
              {money(matter.assumptions.fundingAsk)}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {matter.origin === "desk" && !matter.shared ? (
                <button type="button" onClick={() => listMatter(matter.id)} className={primaryLink}>
                  List on the book
                </button>
              ) : (
                <p className="text-sm text-muted">This matter is visible to capital.</p>
              )}
              <Link href={`/book/${matter.id}`} className={secondaryLink}>
                Open the capital worksheet
              </Link>
              {onInvestors ? (
                <button type="button" onClick={onInvestors} className={secondaryLink}>
                  See who fits
                </button>
              ) : (
                <Link href={`/desk/capital?matter=${matter.id}`} className={secondaryLink}>
                  See who fits
                </Link>
              )}
            </div>
          </div>
          <div>
            <Kicker>Closest mandates</Kicker>
            <ul className="mt-3 space-y-3">
              {matches.map((match) => (
                <li key={match.fund.id} className="surface p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm text-paper">{match.fund.name}</p>
                    <p className="font-mono text-sm text-gold tabular-nums">{match.score}</p>
                  </div>
                  <p className="mt-1 text-xs text-faint">{match.fund.kind}</p>
                  {match.reasons.map((reason) => (
                    <p key={reason} className="mt-2 text-xs leading-relaxed text-muted">
                      {reason}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Kicker>Interest from capital</Kicker>
            {notes.length ? (
              <ul className="mt-3 space-y-3">
                {notes.map((item) => (
                  <li key={item.id} className="surface p-3">
                    <p className="text-sm text-paper">{fundById(item.fundId).name}</p>
                    {item.note ? <p className="mt-1 text-sm leading-relaxed text-muted">{item.note}</p> : null}
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(item.at))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted">
                No fund has recorded interest yet. Capital does that from the worksheet.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
