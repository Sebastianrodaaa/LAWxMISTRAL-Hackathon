"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Deck } from "@/components/deck";
import { ReadingAs } from "@/components/reading-as";
import { RecoveryDesk } from "@/components/recovery-desk";
import { ResearchPanel } from "@/components/research-panel";
import { money } from "@/lib/format";
import { fundById } from "@/lib/funds";
import { useStore } from "@/lib/store";
import { Kicker, Tag } from "./ui";

const tabs = ["Recovery", "Rule 23", "Research", "Folder"] as const;

export function Diligence() {
  const params = useParams<{ id: string }>();
  const { getMatter, ready, fundId, signalInterest, interests } = useStore();
  const matter = getMatter(params.id);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Recovery");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  if (!matter && !ready) {
    return <p className="px-6 py-16 text-muted">Opening the matter…</p>;
  }
  if (!matter) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <h1 className="font-serif text-4xl">This matter is not on the book.</h1>
        <Link href="/book" className="mt-6 inline-block text-gold">
          Back to the book
        </Link>
      </div>
    );
  }

  const recorded = interests.some((item) => item.matterId === matter.id && item.fundId === fundId);
  const composite = Math.round(
    matter.rule23.reduce((sum, factor) => sum + factor.score, 0) / matter.rule23.length,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <Link href="/book" className="text-sm text-faint hover:text-gold">
        The book
      </Link>
      <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <Kicker>{matter.jurisdiction}</Kicker>
          <h1 className="mt-2 max-w-3xl font-serif text-4xl tracking-tight md:text-5xl">{matter.title}</h1>
          <p className="mt-2 text-sm text-muted">{matter.caption}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {matter.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </div>
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Ask</p>
            <p className="font-serif text-3xl text-gold tabular-nums">{money(matter.assumptions.fundingAsk)}</p>
          </div>
          <ReadingAs />
        </div>
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Deck slides={matter.slides} />
        <section className="border border-line bg-panel p-4 md:p-5">
          <div className="flex flex-wrap gap-1 border-b border-line pb-3" role="tablist" aria-label="Analyst desk">
            {tabs.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                onClick={() => setTab(item)}
                className={`cursor-pointer px-2.5 py-1.5 text-sm transition-colors duration-200 ${
                  tab === item ? "text-gold" : "text-muted hover:text-paper"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="pt-4" role="tabpanel">
            {tab === "Recovery" ? <RecoveryDesk key={matter.id} matter={matter} /> : null}
            {tab === "Rule 23" ? (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-muted">
                  Composite {composite} from the folder’s own scores. A higher number is a cleaner worksheet, not a prediction that a court will certify.
                </p>
                <ul className="space-y-4">
                  {matter.rule23.map((factor) => (
                    <li key={factor.factor}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm text-paper">
                          {factor.factor}
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                            {factor.rule}
                          </span>
                        </p>
                        <p className="font-mono text-sm tabular-nums text-gold">{factor.score}</p>
                      </div>
                      <div className="mt-2 h-1 bg-ink">
                        <div className="h-full bg-gold" style={{ width: `${factor.score}%` }} />
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted">{factor.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {tab === "Research" ? (
              <ResearchPanel seed={`${matter.title} class certification and defendant capacity`} />
            ) : null}
            {tab === "Folder" ? (
              <ul className="space-y-3">
                {matter.documents.map((file) => (
                  <li key={file.name} className="border border-line p-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold">{file.name}</p>
                    <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted">{file.text}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </div>

      <form
        className="mt-8 border border-line p-4 md:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          signalInterest(matter.id, note.trim());
          setSaved(true);
        }}
      >
        <Kicker>Interest</Kicker>
        <p className="mt-2 text-sm text-muted">
          Record that {fundById(fundId).name} wants a read. The NGO sees the fund name and your note. Nothing is emailed.
        </p>
        <label className="mt-4 block">
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="w-full border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold"
            placeholder="What you would need before a call."
          />
        </label>
        <button
          type="submit"
          className="mt-3 h-10 cursor-pointer bg-gold px-4 text-sm font-bold text-ink transition-colors duration-200 hover:bg-gold-2"
        >
          {recorded ? "Update interest" : "Record interest"}
        </button>
        {saved ? <p className="mt-3 text-sm text-gold">Recorded on the NGO’s desk.</p> : null}
      </form>
    </div>
  );
}
