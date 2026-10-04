import Link from "next/link";
import { money, multiple } from "@/lib/format";
import { funds } from "@/lib/funds";
import { library } from "@/lib/library";
import { runModel } from "@/lib/model";
import { Kicker, primaryLink, secondaryLink } from "@/components/ui";

export default function Home() {
  return (
    <div>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-8 pt-14 md:px-6 md:pt-20 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div>
          <Kicker n="01">Class actions, read before they are funded</Kicker>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[0.95] tracking-tight text-paper md:text-7xl">
            Point a folder at the desk. Leave with a pitch.
          </h1>
          <div className="mt-6 h-0.5 w-10 rounded-full bg-gold" aria-hidden />
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Atrium is for NGOs bringing class actions and for the hedge funds and litigation desks that finance them. An agent reads the folder and composes the deck. Capital runs a recovery model, a Rule 23 worksheet, and deep research before anyone takes a meeting.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/desk" className={primaryLink}>
              I represent an NGO
            </Link>
            <Link href="/book" className={secondaryLink}>
              I represent capital
            </Link>
          </div>
          <p className="mt-4 text-xs text-faint">No account. Drafts stay in this browser until you list them.</p>
        </div>
        <aside className="surface">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">On the book</span>
            <span className="font-mono text-[11px] text-faint">{library.length} matters</span>
          </div>
          <ul>
            {library.map((matter) => (
              <li key={matter.id} className="border-b border-line last:border-b-0">
                <Link href={`/book/${matter.id}`} className="block cursor-pointer px-4 py-4 transition-colors duration-200 hover:bg-ink">
                  <p className="font-serif text-2xl text-paper">{matter.title}</p>
                  <p className="mt-1 text-sm text-muted">{matter.ngo}</p>
                  <p className="mt-3 flex items-baseline justify-between font-mono text-xs text-faint">
                    <span className="text-gold tabular-nums">{money(matter.assumptions.fundingAsk)}</span>
                    <span>{multiple(runModel(matter.assumptions).moic)} base</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <Kicker n="02">How a matter moves</Kicker>
        <ol className="mt-8 grid gap-3 md:grid-cols-3">
          <li className="surface p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">01</p>
            <h2 className="mt-3 font-serif text-3xl">The folder</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              NGOs drop pleadings, notices, expert notes, and a caption sheet. The agent inventories parties, the class, the theories, and every figure it can actually find.
            </p>
          </li>
          <li className="surface p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">02</p>
            <h2 className="mt-3 font-serif text-3xl">The deck</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Ten slides, same order every time: harm, class, claims, evidence, damages, use of proceeds, the bargain, the risks, the ask. Missing facts stay missing.
            </p>
          </li>
          <li className="surface p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">03</p>
            <h2 className="mt-3 font-serif text-3xl">The book</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Hedge funds and specialist funders open a matter, move the recovery levers, read the Rule 23 worksheet, and search the source library and the live web.
            </p>
          </li>
        </ol>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <Kicker n="03">Capital on the desk</Kicker>
              <h2 className="mt-3 font-serif text-4xl tracking-tight">Mandates, not a feed.</h2>
            </div>
            <Link href="/desk/capital" className="text-sm text-gold">
              Score a matter against these desks
            </Link>
          </div>
          <ul className="surface mt-8 divide-y divide-line">
            {funds.map((fund) => (
              <li key={fund.id} className="grid gap-2 py-4 md:grid-cols-[minmax(0,1.2fr)_auto_auto] md:items-baseline md:gap-8">
                <div>
                  <p className="font-serif text-2xl">{fund.name}</p>
                  <p className="text-sm text-muted">{fund.city}</p>
                </div>
                <p className="text-sm text-faint">{fund.kind}</p>
                <p className="font-mono text-sm tabular-nums text-gold">
                  {money(fund.checkMin)}–{money(fund.checkMax)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
