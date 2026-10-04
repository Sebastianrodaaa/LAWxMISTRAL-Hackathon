"use client";

import Link from "next/link";
import { money } from "@/lib/format";
import { library } from "@/lib/library";
import { useStore } from "@/lib/store";
import { Kicker, Tag, primaryLink } from "./ui";

export function DeskHome() {
  const { drafts } = useStore();
  const unlisted = drafts.filter((matter) => !matter.shared);
  const circulating = [...library, ...drafts.filter((matter) => matter.shared)];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <Kicker n="01">NGO desk</Kicker>
          <h1 className="mt-3 font-serif text-4xl tracking-tight md:text-5xl">Matters in the room.</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            A folder stays a draft until you list it. Capital on the book can already read the three matters below, and any draft you choose to circulate.
          </p>
        </div>
        <Link href="/desk/new" className={primaryLink}>
          New matter from a folder
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">Your drafts</h2>
        {unlisted.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {unlisted.map((matter) => (
              <li key={matter.id}>
                <Link
                  href={`/desk/cases/${matter.id}`}
                  className="block cursor-pointer border border-line p-4 transition-colors duration-200 hover:border-gold"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-serif text-2xl">{matter.title}</p>
                    <Tag>{matter.shared ? "On the book" : "Draft"}</Tag>
                  </div>
                  <p className="mt-2 text-sm text-muted">{matter.caption}</p>
                  <p className="mt-3 font-mono text-sm text-gold tabular-nums">
                    {money(matter.assumptions.fundingAsk)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 border border-dashed border-line p-5 text-sm leading-relaxed text-muted">
            {drafts.length
              ? "Every folder you have run is already on the book."
              : "Nothing from your browser yet. Load the Riverbend sample, or drop your own caption sheet and exhibits."}
          </p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">On the book</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {circulating.map((matter) => (
            <li key={matter.id}>
              <Link
                href={`/desk/cases/${matter.id}`}
                className="flex cursor-pointer flex-col gap-2 py-4 transition-colors duration-200 hover:text-gold md:flex-row md:items-baseline md:justify-between"
              >
                <div>
                  <p className="font-serif text-2xl text-paper">{matter.title}</p>
                  <p className="text-sm text-muted">
                    {matter.ngo} · {matter.jurisdiction}
                    {matter.origin === "desk" ? " · Your listing" : ""}
                  </p>
                </div>
                <p className="font-mono text-sm tabular-nums text-gold">{money(matter.assumptions.fundingAsk)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
