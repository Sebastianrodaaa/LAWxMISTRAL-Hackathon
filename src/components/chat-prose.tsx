"use client";

import { useId } from "react";
import type { ChatCitation } from "@/lib/chat-events";
import { orderCitations } from "@/lib/order-citations";

type Sentence = { text: string; cites: number[] };
type ProseBlock =
  | { kind: "p"; sentences: Sentence[] }
  | { kind: "list"; items: Sentence[] };

export function ChatProse({
  text,
  streaming = false,
  citations = [],
}: {
  text: string;
  streaming?: boolean;
  citations?: ChatCitation[];
}) {
  const held = streaming ? holdOpenMarker(text) : { body: text, tail: "" };
  const ordered = orderCitations(held.body, citations);
  const blocks = proseBlocks(ordered.text);
  const baseId = useId();
  if (!blocks.length && !held.tail) return null;
  const byNumber = new Map(ordered.citations.map((item) => [item.n, item]));
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const last = index === blocks.length - 1;
        if (block.kind === "list") {
          return (
            <ul key={index} className="space-y-2 border-l border-line pl-4">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="text-[15px] leading-7 text-paper">
                  <SentenceView sentence={item} citations={byNumber} baseId={`${baseId}-${index}-${itemIndex}`} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="text-[15px] leading-7 text-paper">
            {block.sentences.map((sentence, sentenceIndex) => (
              <SentenceView
                key={sentenceIndex}
                sentence={sentence}
                citations={byNumber}
                baseId={`${baseId}-${index}-${sentenceIndex}`}
                leading={sentenceIndex > 0}
              />
            ))}
            {streaming && last ? <Caret /> : null}
          </p>
        );
      })}
      {streaming && !blocks.length ? <Caret /> : null}
    </div>
  );
}

function SentenceView({
  sentence,
  citations,
  baseId,
  leading = false,
}: {
  sentence: Sentence;
  citations: Map<number, ChatCitation>;
  baseId: string;
  leading?: boolean;
}) {
  return (
    <>
      {leading ? " " : null}
      {sentence.text}
      {sentence.cites.map((n, index) => {
        const source = citations.get(n);
        if (!source) return <span key={n}> [{n}]</span>;
        return <CitationChip key={`${n}-${index}`} source={source} panelId={`${baseId}-${n}-${index}`} />;
      })}
    </>
  );
}

function Caret() {
  return <span className="ml-0.5 inline-block h-[1em] w-px translate-y-0.5 animate-pulse bg-paper motion-reduce:animate-none" aria-hidden="true" />;
}

function proseBlocks(raw: string): ProseBlock[] {
  const cleaned = raw
    .replace(/\r/g, "")
    .replace(/^\s*(\*\*)?revised analysis:?(\*\*)?\s*/i, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .trim();
  if (!cleaned) return [];
  const blocks: ProseBlock[] = [];
  for (const part of cleaned.split(/\n{2,}/)) {
    const lines = part
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) continue;
    const listed = lines.every((line) => /^[-•*]\s+/.test(line) || /^\d+\.\s+/.test(line));
    if (lines.length > 1 && listed) {
      blocks.push({
        kind: "list",
        items: lines.map((line) => sentenceOf(line.replace(/^([-*•]|\d+\.)\s+/, ""))),
      });
    } else {
      blocks.push({ kind: "p", sentences: sentencesOf(lines.join(" ")) });
    }
  }
  return blocks;
}

function sentencesOf(paragraph: string): Sentence[] {
  const pieces = paragraph.split(/(?<=[.?!])\s+(?=[A-Z“"'])/);
  const sentences = pieces.map(sentenceOf).filter((sentence) => sentence.text || sentence.cites.length);
  return sentences.length ? sentences : [sentenceOf(paragraph)];
}

function sentenceOf(raw: string): Sentence {
  const cites: number[] = [];
  const text = raw
    .replace(/\[(\d{1,2})\]/g, (_, n: string) => {
      const value = Number(n);
      if (!cites.includes(value)) cites.push(value);
      return "";
    })
    .replace(/\s+/g, " ")
    .replace(/\s+([.?!])/g, "$1")
    .trim();
  cites.sort((a, b) => a - b);
  return { text, cites };
}

function holdOpenMarker(text: string) {
  const match = text.match(/\[\d{0,2}$/);
  if (!match || match.index === undefined) return { body: text, tail: "" };
  return { body: text.slice(0, match.index), tail: match[0] };
}

function placeSourceCard(chip: HTMLButtonElement, panel: HTMLElement) {
  for (const node of document.querySelectorAll<HTMLElement>("[popover]")) {
    if (node !== panel && node.matches(":popover-open")) {
      try {
        node.hidePopover();
      } catch {
        // Another card can already be closing.
      }
    }
  }
  const rect = chip.getBoundingClientRect();
  const width = 320;
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
  const roomBelow = window.innerHeight - rect.bottom;
  const top = roomBelow > 200 ? rect.bottom + 8 : Math.max(12, rect.top - 240);
  panel.style.inset = "auto";
  panel.style.margin = "0";
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

function CitationChip({ source, panelId }: { source: ChatCitation; panelId: string }) {
  const origin = source.origin === "folder" ? "Folder" : source.origin === "web" ? "Live web" : "Library";
  return (
    <>
      <sup className="ml-0.5">
        <button
          type="button"
          className="inline-flex h-4 min-w-4 cursor-pointer items-center justify-center rounded-[5px] border border-line bg-white px-1 align-baseline text-[10px] font-semibold leading-none text-gold hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold active:bg-hover"
          popoverTarget={panelId}
          aria-label={`Source ${source.n}, ${source.title}`}
          onClick={(event) => event.stopPropagation()}
        >
          {source.n}
        </button>
      </sup>
      <span
        id={panelId}
        popover="auto"
        className="citation-card inset-auto m-0 max-h-72 w-[min(20rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-line bg-white p-3 text-left shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
        onToggle={(event) => {
          const panel = event.currentTarget;
          const opened = (event.nativeEvent as ToggleEvent).newState === "open";
          if (!opened) return;
          const chip = panel.previousElementSibling?.querySelector("button");
          if (chip instanceof HTMLButtonElement) placeSourceCard(chip, panel);
        }}
      >
        <span className="block text-[11px] font-medium tracking-[0.14em] text-gold uppercase">{origin}</span>
        <span className="mt-1 block text-sm font-medium text-paper">{source.title}</span>
        <span className="mt-0.5 block text-[12px] text-faint">{source.publisher}</span>
        {source.excerpt ? (
          <span className="mt-2 block text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{source.excerpt}</span>
        ) : null}
        {source.url ? (
          <a href={source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[13px] font-medium text-gold">
            Open source
          </a>
        ) : null}
      </span>
    </>
  );
}
