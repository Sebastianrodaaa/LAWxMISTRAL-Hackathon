"use client";

import Link from "next/link";
import { useState } from "react";
import { money, multiple } from "@/lib/format";
import { runModel } from "@/lib/model";
import { useStore } from "@/lib/store";
import { ReadingAs } from "./reading-as";
import { Kicker, Tag } from "./ui";

export function DealBook() {
  const { book } = useStore();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const rows = book.filter((matter) => {
    if (!needle) return true;
    const hay = `${matter.title} ${matter.ngo} ${matter.caption} ${matter.tags.join(" ")} ${matter.jurisdiction}`.toLowerCase();
    return hay.includes(needle);
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <Kicker n="01">Deal book</Kicker>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-paper md:text-5xl">
            Matters circulating for a read.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Open a matter to move the recovery model, score Rule 23, and run research. Interest you record is visible to the NGO on their desk.
          </p>
        </div>
        <div className="w-full space-y-3 md:w-72">
          <ReadingAs />
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              Search the book
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Claim, NGO, forum"
              className="h-10 w-full border border-line bg-ink px-3 text-sm text-paper outline-none placeholder:text-faint focus:border-gold"
            />
          </label>
        </div>
      </div>
      <div className="mt-8 hidden border border-line md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
            <tr>
              <th className="px-4 py-3 font-normal">Matter</th>
              <th className="px-4 py-3 font-normal">NGO</th>
              <th className="px-4 py-3 font-normal">Ask</th>
              <th className="px-4 py-3 font-normal">Base MOIC</th>
              <th className="px-4 py-3 font-normal">Stage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((matter) => {
              const moic = runModel(matter.assumptions).moic;
              return (
                <tr key={matter.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-4">
                    <Link href={`/book/${matter.id}`} className="cursor-pointer text-paper hover:text-gold">
                      {matter.title}
                    </Link>
                    <p className="mt-1 text-xs text-faint">
                      {matter.jurisdiction}
                      {matter.origin === "desk" ? " · Your listing" : ""}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-muted">{matter.ngo}</td>
                  <td className="px-4 py-4 tabular-nums">{money(matter.assumptions.fundingAsk)}</td>
                  <td className="px-4 py-4 tabular-nums text-gold">{multiple(moic)}</td>
                  <td className="px-4 py-4 text-muted">{matter.stage}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="mt-8 space-y-3 md:hidden">
        {rows.map((matter) => (
          <li key={matter.id}>
            <Link href={`/book/${matter.id}`} className="block cursor-pointer border border-line p-4 hover:border-gold">
              <p className="font-serif text-2xl text-paper">{matter.title}</p>
              <p className="mt-1 text-sm text-muted">
                {matter.ngo}
                {matter.origin === "desk" ? " · Your listing" : ""}
              </p>
              <p className="mt-3 font-mono text-sm text-gold tabular-nums">
                {money(matter.assumptions.fundingAsk)} · {multiple(runModel(matter.assumptions).moic)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length ? null : (
        <p className="mt-6 text-sm text-muted">Nothing on the book matches that search.</p>
      )}
      <ul className="mt-6 flex flex-wrap gap-2">
        {rows.flatMap((matter) => matter.tags).filter((tag, index, list) => list.indexOf(tag) === index).map((tag) => (
          <li key={tag}>
            <Tag>{tag}</Tag>
          </li>
        ))}
      </ul>
    </div>
  );
}
