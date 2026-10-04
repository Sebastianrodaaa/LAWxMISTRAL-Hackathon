"use client";

import { useState } from "react";
import { band } from "@/lib/model";
import { money, multiple, pct, people } from "@/lib/format";
import type { Assumptions, Matter } from "@/lib/types";

export function RecoveryDesk({ matter }: { matter: Matter }) {
  const [input, setInput] = useState<Assumptions>(matter.assumptions);
  const result = band(input);
  const base = result.base;
  const maxBar = Math.max(result.low.expected, result.base.expected, result.high.expected, 1);

  const set = (patch: Partial<Assumptions>) => setInput((current) => ({ ...current, ...patch }));

  return (
    <div className="space-y-6">
      <div>
        <p className="font-serif text-3xl tracking-tight text-paper tabular-nums">{multiple(base.moic)}</p>
        <p className="mt-1 text-sm text-muted">
          Certification-weighted proceeds of {money(base.expected)} on an ask of {money(input.fundingAsk)}. Rough annualized {pct(base.irr)} over {input.years} years. Not a forecast.
        </p>
      </div>
      <div className="space-y-3">
        <Bar label="Low" value={result.low.expected} max={maxBar} />
        <Bar label="Base" value={result.base.expected} max={maxBar} />
        <Bar label="High" value={result.high.expected} max={maxBar} />
      </div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm">
        <Fact label="Participating" value={`${people(base.participants)} ${input.classUnit}`} />
        <Fact label="Gross recovery" value={money(base.gross)} />
        <Fact label="After counsel" value={money(base.afterCounsel)} />
        <Fact label="To capital, if certified" value={money(base.fundTake)} />
      </dl>
      {base.capped ? (
        <p className="text-sm text-warn">
          Gross recovery is capped by the defendant-capacity input of {money(input.defendantCapacity)}.
        </p>
      ) : null}
      {matter.gaps.length ? (
        <p className="text-sm text-warn">
          The folder did not state: {matter.gaps.join(", ")}. Those levers still move, and they started from placeholders.
        </p>
      ) : null}
      <div className="space-y-4 border-t border-line pt-4">
        <Lever
          label="Participation"
          display={pct(input.participation)}
          min={5}
          max={95}
          step={1}
          value={Math.round(input.participation * 100)}
          onChange={(value) => set({ participation: value / 100 })}
          hint="Share of the class that stays in and has a claim worth counting."
        />
        <Lever
          label="Certification probability"
          display={pct(input.certProbability)}
          min={5}
          max={90}
          step={1}
          value={Math.round(input.certProbability * 100)}
          onChange={(value) => set({ certProbability: value / 100 })}
          hint="Haircut applied to the fund's share. A denial returns zero on this worksheet."
        />
        <Lever
          label="Capital's share of net recovery"
          display={pct(input.fundShare)}
          min={5}
          max={40}
          step={1}
          value={Math.round(input.fundShare * 100)}
          onChange={(value) => set({ fundShare: value / 100 })}
        />
        <Lever
          label={input.primaryLabel}
          display={money(input.primaryHarm)}
          min={100}
          max={Math.max(20000, input.primaryHarm * 3)}
          step={100}
          value={input.primaryHarm}
          onChange={(value) => set({ primaryHarm: value })}
        />
        <Lever
          label="Years to resolution"
          display={input.years.toFixed(1)}
          min={2}
          max={8}
          step={0.5}
          value={input.years}
          onChange={(value) => set({ years: value })}
          hint="Used only to annualize the multiple. It does not change proceeds."
        />
      </div>
      <p className="text-xs leading-relaxed text-faint">
        This model runs in the browser. Gross is participating people times primary harm, plus the secondary harm times its share, then limited by defendant capacity. Counsel is taken out. Capital takes its share. Expected proceeds multiply by the certification haircut.
      </p>
    </div>
  );
}

function Lever({
  label,
  display,
  min,
  max,
  step,
  value,
  onChange,
  hint,
}: {
  label: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-paper">{label}</span>
        <span className="font-mono text-sm text-gold tabular-nums">{display}</span>
      </span>
      <input
        className="mt-2 w-full cursor-pointer"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {hint ? <span className="mt-1 block text-xs leading-relaxed text-faint">{hint}</span> : null}
    </label>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max(3, (value / max) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[11px] uppercase tracking-[0.14em]">
        <span className="text-faint">{label}</span>
        <span className="text-paper tabular-nums">{money(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
        <div className="h-full rounded-full bg-gold" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel px-3 py-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{label}</dt>
      <dd className="mt-1 text-paper tabular-nums">{value}</dd>
    </div>
  );
}
