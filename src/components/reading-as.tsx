"use client";

import { funds } from "@/lib/funds";
import { useStore } from "@/lib/store";

export function ReadingAs({ labeled = true }: { labeled?: boolean }) {
  const { fundId, setFundId } = useStore();
  return (
    <label className="block">
      {labeled ? (
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
          Reading as
        </span>
      ) : null}
      <select
        aria-label="Reading as"
        value={fundId}
        onChange={(event) => setFundId(event.target.value)}
        className="h-11 w-full cursor-pointer rounded-xl border border-transparent bg-elevated px-3 text-sm text-paper"
      >
        {funds.map((fund) => (
          <option key={fund.id} value={fund.id}>
            {fund.name}
          </option>
        ))}
      </select>
    </label>
  );
}
