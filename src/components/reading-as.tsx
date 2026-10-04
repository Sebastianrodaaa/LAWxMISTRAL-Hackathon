"use client";

import { funds } from "@/lib/funds";
import { useStore } from "@/lib/store";

export function ReadingAs() {
  const { fundId, setFundId } = useStore();
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
        Reading as
      </span>
      <select
        value={fundId}
        onChange={(event) => setFundId(event.target.value)}
        className="h-10 w-full cursor-pointer border border-line bg-ink px-2 text-sm text-paper"
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
