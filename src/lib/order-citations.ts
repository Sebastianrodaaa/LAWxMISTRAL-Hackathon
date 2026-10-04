import type { ChatCitation } from "./chat-events";

/** Number cited sources from 1 in the order they first appear in the note. */
export function orderCitations(text: string, citations: ChatCitation[]) {
  const byNumber = new Map(citations.map((item) => [item.n, item]));
  const order: number[] = [];
  for (const match of text.matchAll(/\[(\d{1,2})\]/g)) {
    const n = Number(match[1]);
    if (!byNumber.has(n) || order.includes(n)) continue;
    order.push(n);
  }
  const display = new Map(order.map((n, index) => [n, index + 1]));
  return {
    text: text.replace(/\[(\d{1,2})\]/g, (marker, raw: string) => {
      const next = display.get(Number(raw));
      return next ? `[${next}]` : marker;
    }),
    citations: order.map((n, index) => ({ ...byNumber.get(n)!, n: index + 1 })),
  };
}
