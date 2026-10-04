import { money } from "./format";
import type { Fund, Matter } from "./types";

export function matchFund(matter: Matter, fund: Fund) {
  const overlap = matter.tags.filter((tag) =>
    fund.tags.some((fundTag) => tag.includes(fundTag) || fundTag.includes(tag)),
  );
  const ask = matter.assumptions.fundingAsk;
  const inRange = ask >= fund.checkMin * 0.85 && ask <= fund.checkMax * 1.1;
  const near = ask >= fund.checkMin * 0.45 && ask <= fund.checkMax * 1.5;
  let score = 26 + overlap.length * 15;
  if (inRange) score += 22;
  else if (near) score += 8;
  if (fund.kind === "Impact desk") score += 4;
  score = Math.max(8, Math.min(96, score));

  const reasons = [
    overlap.length
      ? `Mandate overlaps on ${overlap.join(", ")}.`
      : "No overlap with the stated mandate.",
    inRange
      ? "The ask sits inside the check range."
      : `Ask is ${money(ask)} against a ${money(fund.checkMin)}–${money(fund.checkMax)} check.`,
  ];

  return { fund, score, reasons, overlap };
}

export function rankFunds(matter: Matter, list: Fund[]) {
  return list
    .map((fund) => matchFund(matter, fund))
    .sort((a, b) => b.score - a.score);
}
