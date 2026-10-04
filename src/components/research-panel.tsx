"use client";

import { useState } from "react";
import { ChatProse } from "@/components/chat-prose";
import type { ChatCitation } from "@/lib/chat-events";
import { readChat } from "@/lib/chat-stream";
import type { Hit } from "@/lib/types";
import { HarnessNote, type HarnessDebate } from "./harness-note";
import { Field, inputClass, primaryButton } from "./ui";

const suggestions = [
  "PFAS medical monitoring and predominance",
  "Litigation funding multiples and control of the case",
  "Hospital data breach standing",
  "FLSA shift-lead exemption and arbitration",
];

export function ResearchPanel({ seed }: { seed?: string }) {
  const [query, setQuery] = useState(seed ?? suggestions[0]);
  const [synthesis, setSynthesis] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [live, setLive] = useState(false);
  const [reflection, setReflection] = useState("");
  const [confidence, setConfidence] = useState<number | undefined>(undefined);
  const [debate, setDebate] = useState<HarnessDebate[]>([]);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [citations, setCitations] = useState<ChatCitation[]>([]);

  async function run(nextQuery?: string) {
    const asked = (nextQuery ?? query).trim();
    if (!asked) return;
    setQuery(asked);
    setPending(true);
    setError("");
    setWarning("");
    setReflection("");
    setConfidence(undefined);
    setDebate([]);
    setSynthesis("");
    setCitations([]);
    setStatus("Reading the library");
    setLive(false);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: asked }),
      });
      const hits: Hit[] = [];
      const done = await readChat(response, (event) => {
        if (event.type === "status") setStatus(event.label);
        else if (event.type === "citations") setCitations(event.citations);
        else if (event.type === "step" && (event.step.tool === "research" || event.step.tool === "web")) {
          if (event.step.tool === "web") setLive(true);
          hits.push({
            title: event.step.label,
            publisher: event.step.detail,
            excerpt: "",
            origin: event.step.tool === "web" ? "web" : "library",
          });
          setHits([...hits]);
        } else if (event.type === "token") {
          setStatus("");
          setSynthesis((current) => current + event.text);
        } else if (event.type === "done") {
          setSynthesis(event.text);
          setWarning(event.warning || "");
          setReflection(event.reflection || "");
          setConfidence(typeof event.confidence === "number" ? event.confidence : undefined);
          setDebate(event.debate || []);
          if (event.citations?.length) setCitations(event.citations);
        }
      });
      setSynthesis(done.text);
      if (hits.length) setHits(hits);
    } catch {
      setError("Research did not run. Check the connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run();
        }}
      >
        <Field label="Question">
          <input
            className={inputClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask about the claim, the forum, or the funding market"
          />
        </Field>
        <button
          type="submit"
          disabled={pending || !query.trim()}
          className={`mt-3 ${primaryButton}`}
        >
          {pending ? "Reading sources…" : "Run research"}
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => void run(item)}
            className="cursor-pointer rounded-full bg-elevated px-3 py-1.5 text-left text-xs text-muted transition-colors duration-200 hover:text-paper"
          >
            {item}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-warn">{error}</p> : null}
      {synthesis || pending ? (
        <div className="surface p-4" aria-live="polite">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
            {status || (live ? "Note · library and live web" : "Note · source library")}
          </p>
          <div className="mt-3">
            <ChatProse text={synthesis} citations={citations} streaming={pending} />
          </div>
          {warning ? <p className="mt-2 text-sm text-warn">{warning}</p> : null}
          <HarnessNote reflection={reflection} confidence={confidence} debate={debate} />
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-muted">
          Research reads the Atrium source library, then a scholar and a critic check the note against those sources. If the server has a Tavily key, live web hits are labeled separately. Without a Mistral key, you still get a stitched reading of the library.
        </p>
      )}
      {hits.length ? (
        <ul className="space-y-3">
          {hits.map((hit) => (
            <li key={`${hit.origin}-${hit.title}`} className="surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
                  {hit.origin === "web" ? "Live web" : "Library"}
                </span>
                <span className="text-xs text-faint">{hit.publisher}</span>
              </div>
              {hit.url ? (
                <a
                  href={hit.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-sm text-paper underline decoration-line underline-offset-4 hover:decoration-gold"
                >
                  {hit.title}
                </a>
              ) : (
                <p className="mt-2 text-sm text-paper">{hit.title}</p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-muted">{hit.excerpt}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
