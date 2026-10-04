"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { InvestorActivity, type ActivityRow } from "@/components/investor-activity";
import { HarnessNote, type HarnessDebate } from "@/components/harness-note";
import { useStore } from "@/lib/store";
import type { AgentStep } from "@/lib/rakazo-types";
import type { Hit, Matter } from "@/lib/types";
import { cn } from "@/lib/utils";

type UserTurn = {
  id: string;
  role: "user";
  text: string;
  pitch?: string;
};

type AssistantTurn = {
  id: string;
  role: "assistant";
  text: string;
  warning: string;
  reflection: string;
  confidence?: number;
  debate: HarnessDebate[];
  running: boolean;
  startedAt: number;
  elapsedMs: number;
  query?: string;
  rows: ActivityRow[];
};

type Turn = UserTurn | AssistantTurn;

export function InvestorChat({ matterId, onMatter }: { matterId: string; onMatter: (id: string) => void }) {
  const { book, getMatter } = useStore();
  const matter = matterId ? getMatter(matterId) : undefined;
  const endRef = useRef<HTMLDivElement>(null);
  const turnCount = useRef(0);
  const [note, setNote] = useState("");
  const [running, setRunning] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 60, maxHeight: 200 });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  const focused =
    turns.find((turn) => turn.id === focusId && turn.role === "assistant") ??
    [...turns].reverse().find((turn) => turn.role === "assistant");
  const activity = focused && focused.role === "assistant" ? focused : null;

  async function send() {
    const text = note.trim();
    if (!text || running) return;
    const pitch = matter;
    turnCount.current += 1;
    const userId = `turn-${turnCount.current}`;
    turnCount.current += 1;
    const assistantId = `turn-${turnCount.current}`;
    const preview = previewRows(text, pitch?.title);
    const startedAt = Date.now();
    setTurns((current) => [
      ...current,
      { id: userId, role: "user", text, pitch: pitch ? `${pitch.ngo} · ${pitch.title}` : undefined },
      {
        id: assistantId,
        role: "assistant",
        text: "",
        warning: "",
        reflection: "",
        debate: [],
        running: true,
        startedAt,
        elapsedMs: 0,
        query: text,
        rows: preview.slice(0, 1),
      },
    ]);
    setFocusId(assistantId);
    setNote("");
    adjustHeight(true);
    setRunning(true);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let shown = 1;
    const timer = window.setInterval(() => {
      shown += 1;
      setTurns((current) =>
        current.map((turn) =>
          turn.id === assistantId && turn.role === "assistant" && turn.running
            ? { ...turn, rows: preview.slice(0, shown) }
            : turn,
        ),
      );
      if (shown >= preview.length) window.clearInterval(timer);
    }, reduce ? 0 : 680);

    try {
      const result = pitch ? await askAgent(text, priorTurns(turns), pitch) : await askResearch(text);
      window.clearInterval(timer);
      const elapsedMs = Math.max(1, Date.now() - startedAt);
      setTurns((current) =>
        current.map((turn) =>
          turn.id === assistantId && turn.role === "assistant"
            ? {
                ...turn,
                text: result.text,
                warning: result.warning,
                reflection: result.reflection,
                confidence: result.confidence,
                debate: result.debate,
                running: false,
                elapsedMs,
                query: result.query,
                rows: result.rows.length ? result.rows : preview,
              }
            : turn,
        ),
      );
    } catch (error) {
      window.clearInterval(timer);
      const message = error instanceof Error ? error.message : "The desk did not answer.";
      setTurns((current) =>
        current.map((turn) =>
          turn.id === assistantId && turn.role === "assistant"
            ? {
                ...turn,
                text: message,
                running: false,
                elapsedMs: Math.max(1, Date.now() - startedAt),
                rows: [{ id: "error", kind: "step", primary: "The desk did not answer" }],
              }
            : turn,
        ),
      );
    } finally {
      setRunning(false);
    }
  }

  const ready = note.trim().length > 0 && !running;
  const empty = turns.length === 0;

  const composer = (
    <div className="w-full">
      <div className="rounded-2xl border border-line bg-panel">
        {matter ? (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            <span className="max-w-full truncate rounded-full bg-elevated py-1 pr-3 pl-3 text-xs text-paper">
              {matter.ngo} · {matter.title}
            </span>
          </div>
        ) : null}
        <label className="sr-only" htmlFor="investor-note">
          Message
        </label>
        <textarea
          id="investor-note"
          ref={textareaRef}
          value={note}
          rows={1}
          placeholder={matter ? `Ask about ${matter.title}` : "Ask about a claim, a forum, or a pitch"}
          onChange={(event) => {
            setNote(event.target.value);
            adjustHeight();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          className="w-full resize-none bg-transparent px-4 py-3 text-sm text-paper outline-none placeholder:text-faint"
          style={{ overflow: "hidden" }}
        />
        <div className="flex items-center justify-between gap-2 p-3">
          <label className="min-w-0">
            <span className="sr-only">Pitch</span>
            <select
              value={matterId}
              onChange={(event) => onMatter(event.target.value)}
              className="h-8 max-w-[220px] cursor-pointer truncate rounded-lg bg-transparent px-2 text-xs text-muted"
            >
              <option value="">No pitch</option>
              {book.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.ngo} · {item.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void send()}
            disabled={!ready}
            aria-label="Send"
            className={cn(
              "flex cursor-pointer items-center rounded-lg border px-1.5 py-1.5 transition-colors duration-200 disabled:cursor-not-allowed",
              ready ? "border-fill bg-fill text-white hover:bg-fill-2" : "border-line text-faint",
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const activityLabel = activityLabelFor(activity);

  return (
    <div className="@container flex h-full min-h-0">
      <div className="flex h-full min-h-0 w-full flex-col @min-[760px]:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className={cn("min-h-0 flex-1", empty ? "flex items-center" : "overflow-y-auto")}>
          {empty ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-10">
              <h1 className="text-center font-serif text-4xl tracking-tight text-paper">Ask about a pitch.</h1>
              <p className="mt-3 max-w-xl text-center text-sm leading-relaxed text-muted">
                The desk reads the folder you choose, then searches the library. Nothing is emailed.
              </p>
              <div className="mt-8 w-full">{composer}</div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
              {turns.map((turn) =>
                turn.role === "user" ? (
                  <div key={turn.id} className="ml-auto max-w-[85%] rounded-2xl bg-elevated px-4 py-3">
                    <p className="text-sm leading-relaxed text-paper">{turn.text}</p>
                    {turn.pitch ? <p className="mt-2 truncate text-xs text-muted">{turn.pitch}</p> : null}
                  </div>
                ) : (
                  <article key={turn.id} className="max-w-3xl" aria-live="polite">
                    <button type="button" className="cursor-pointer text-left" onClick={() => setFocusId(turn.id)}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-paper">
                        {turn.text || (turn.running ? "Reading…" : "")}
                      </p>
                    </button>
                    {turn.warning ? <p className="mt-2 text-sm text-warn">{turn.warning}</p> : null}
                    <HarnessNote reflection={turn.reflection} confidence={turn.confidence} debate={turn.debate} />
                  </article>
                ),
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>
        {empty ? null : <div className="mx-auto w-full max-w-3xl px-4 pt-2 pb-4">{composer}</div>}
      </div>
      <aside className="max-h-52 shrink-0 overflow-auto border-t border-line bg-ink @min-[760px]:max-h-none @min-[760px]:w-[300px] @min-[760px]:border-t-0 @min-[760px]:border-l" aria-label="AI activity">
        <InvestorActivity
          key={activity?.id ?? "idle"}
          running={Boolean(activity?.running)}
          label={activityLabel}
          query={activity?.query}
          rows={activity?.rows ?? []}
        />
      </aside>
      </div>
    </div>
  );
}

function activityLabelFor(turn: AssistantTurn | null) {
  if (!turn) return "Activity";
  if (turn.running) return turn.rows.some((row) => row.kind === "search") ? "Searching the library" : "Thinking";
  const tools = turn.rows.filter((row) => row.kind === "tool").length;
  const search = turn.rows.some((row) => row.kind === "search");
  if (search && tools === 0) return "Searched the library";
  if (tools > 0 && turn.rows.every((row) => row.kind === "tool")) {
    return `Ran ${tools} tool${tools === 1 ? "" : "s"}`;
  }
  const seconds = Math.max(1, Math.round(turn.elapsedMs / 1000));
  return `Thought for ${seconds} second${seconds === 1 ? "" : "s"}`;
}

function previewRows(question: string, title?: string): ActivityRow[] {
  return [
    { id: "read", kind: "step", primary: title ? `Reading ${title}` : "Reading the question", secondary: question.slice(0, 72) },
    { id: "search", kind: "search", primary: "Source library", secondary: "Atrium" },
    { id: "note", kind: "step", primary: "Writing the note" },
  ];
}

function priorTurns(turns: Turn[]) {
  const history: { role: "user" | "assistant"; text: string }[] = [];
  for (const turn of turns) {
    if (turn.role === "user") history.push({ role: "user", text: turn.text });
    else if (turn.text && !turn.running) history.push({ role: "assistant", text: turn.text });
  }
  return history;
}

async function askAgent(text: string, history: { role: "user" | "assistant"; text: string }[], matter: Matter) {
  const response = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [...history, { role: "user", text }],
      matter: toBrief(matter),
    }),
  });
  const data = (await response.json()) as {
    error?: string;
    text?: string;
    steps?: AgentStep[];
    warning?: string;
    reflection?: string;
    confidence?: number;
    debate?: HarnessDebate[];
  };
  if (!response.ok || !data.text) throw new Error(data.error || "The desk did not answer.");
  return {
    text: data.text,
    warning: data.warning || "",
    reflection: data.reflection || "",
    confidence: data.confidence,
    debate: data.debate || [],
    query: (data.steps ?? []).some((step) => step.tool === "research") ? text : undefined,
    rows: rowsFromSteps(data.steps ?? []),
  };
}

async function askResearch(text: string) {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: text }),
  });
  const data = (await response.json()) as {
    error?: string;
    synthesis?: string;
    hits?: Hit[];
    warning?: string;
    reflection?: string;
    confidence?: number;
    debate?: HarnessDebate[];
  };
  if (!response.ok || !data.synthesis) throw new Error(data.error || "Research did not run.");
  const hits = data.hits ?? [];
  const debate = data.debate ?? [];
  return {
    text: data.synthesis,
    warning: data.warning || "",
    reflection: data.reflection || "",
    confidence: data.confidence,
    debate,
    query: text,
    rows: [
      ...hits.map((hit, index) => ({
        id: `${hit.origin}-${hit.title}-${index}`,
        kind: "search" as const,
        primary: hit.title,
        secondary: hit.publisher,
        href: hit.url,
      })),
      ...debate.map((round) => ({
        id: `critic-${round.round}`,
        kind: "step" as const,
        primary: `Critic · round ${round.round}`,
        secondary: round.critic,
      })),
    ],
  };
}

function rowsFromSteps(steps: AgentStep[]): ActivityRow[] {
  const rows: ActivityRow[] = [];
  steps.forEach((step, index) => {
    if (step.tool === "research") {
      const titles = step.detail.split(" · ").map((item) => item.trim()).filter(Boolean);
      const failed = titles.length === 0 || /^(Empty question|Search failed|No source)$/.test(titles[0] ?? "");
      if (failed) {
        rows.push({ id: `research-${index}`, kind: "search", primary: step.label, secondary: step.detail });
        return;
      }
      titles.forEach((title, titleIndex) => {
        rows.push({ id: `research-${index}-${titleIndex}`, kind: "search", primary: title, secondary: "Library" });
      });
      return;
    }
    if (step.tool === "read_document" || step.tool === "read_matter") {
      rows.push({
        id: `${step.tool}-${index}`,
        kind: "tool",
        primary: step.label,
        secondary: step.detail,
        mono: true,
      });
      return;
    }
    rows.push({ id: `${step.tool}-${index}`, kind: "step", primary: step.label, secondary: step.detail });
  });
  return rows;
}

function toBrief(matter: Matter) {
  return {
    id: matter.id,
    title: matter.title,
    caption: matter.caption,
    ngo: matter.ngo,
    focus: matter.focus,
    jurisdiction: matter.jurisdiction,
    stage: matter.stage,
    counsel: matter.counsel,
    tags: matter.tags,
    theories: matter.theories,
    summary: matter.summary,
    gaps: matter.gaps,
    fundingAsk: matter.assumptions.fundingAsk,
    classSize: matter.assumptions.classSize,
    classUnit: matter.assumptions.classUnit,
    documents: matter.documents.map((file) => ({
      name: file.name,
      kind: file.kind,
      text: file.text,
    })),
  };
}

function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      textarea.style.height = `${minHeight}px`;
      const next = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY));
      textarea.style.height = `${next}px`;
    },
    [minHeight, maxHeight],
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) textarea.style.height = `${minHeight}px`;
  }, [minHeight]);

  useEffect(() => {
    const onResize = () => adjustHeight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}
