"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { addDroppedFiles, AttachmentChips, ChatAttach, documentsFromAttachments, type ChatAttachment } from "@/components/chat-attach";
import { ChatProse } from "@/components/chat-prose";
import { InvestorActivity, type ActivityRow } from "@/components/investor-activity";
import { HarnessNote, type HarnessDebate } from "@/components/harness-note";
import type { ChatCitation, ChatEvent, ChatStep } from "@/lib/chat-events";
import { readChat } from "@/lib/chat-stream";
import { buildMatter } from "@/lib/build";
import { useStore } from "@/lib/store";
import type { Matter } from "@/lib/types";
import { cn } from "@/lib/utils";

type UserTurn = {
  id: string;
  role: "user";
  text: string;
  pitch?: string;
  files: { name: string; kind: "sanction" | "file" }[];
};

type AssistantTurn = {
  id: string;
  role: "assistant";
  text: string;
  status: string;
  warning: string;
  reflection: string;
  confidence?: number;
  debate: HarnessDebate[];
  running: boolean;
  startedAt: number;
  elapsedMs: number;
  query?: string;
  rows: ActivityRow[];
  citations?: ChatCitation[];
};

type Turn = UserTurn | AssistantTurn;

export function InvestorChat({ matterId, onMatter }: { matterId: string; onMatter: (id: string) => void }) {
  const { getMatter } = useStore();
  const matter = matterId ? getMatter(matterId) : undefined;
  const endRef = useRef<HTMLDivElement>(null);
  const turnCount = useRef(0);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [over, setOver] = useState(false);
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
    const extra = documentsFromAttachments(attachments);
    if ((!text && !extra.length) || running) return;
    const pitch = matter;
    const labels = attachments.map((item) => item.label).join(", ");
    const subject = pitch
      ? {
          ...pitch,
          summary: extra.length ? `Attached for this conversation: ${labels}. ${pitch.summary}` : pitch.summary,
          documents: mergeDocuments([...extra, ...pitch.documents]),
        }
      : extra.length
        ? buildMatter(extra, { origin: "desk", shared: false })
        : undefined;
    turnCount.current += 1;
    const userId = `turn-${turnCount.current}`;
    turnCount.current += 1;
    const assistantId = `turn-${turnCount.current}`;
    const startedAt = Date.now();
    const paint = {
      text: "",
      status: subject ? "Reading the folder" : "Reading the library",
      rows: [] as ActivityRow[],
      debate: [] as HarnessDebate[],
      query: text || undefined,
      citations: [] as ChatCitation[],
    };
    setTurns((current) => [
      ...current,
      {
        id: userId,
        role: "user",
        text: text || "Read what I attached.",
        pitch: pitch ? `${pitch.ngo} · ${pitch.title}` : undefined,
        files: attachments.map((item) => ({ name: item.label, kind: item.kind })),
      },
      {
        id: assistantId,
        role: "assistant",
        text: "",
        status: paint.status,
        warning: "",
        reflection: "",
        debate: [],
        running: true,
        startedAt,
        elapsedMs: 0,
        query: paint.query,
        rows: [],
      },
    ]);
    setFocusId(assistantId);
    setNote("");
    adjustHeight(true);
    setRunning(true);

    let timer = 0;
    const show = () => {
      timer = 0;
      setTurns((current) =>
        current.map((turn) =>
          turn.id === assistantId && turn.role === "assistant" && turn.running
            ? { ...turn, text: paint.text, status: paint.status, rows: paint.rows, debate: paint.debate, query: paint.query, citations: paint.citations }
            : turn,
        ),
      );
    };
    const schedule = () => {
      if (timer) return;
      timer = window.setTimeout(show, 0);
    };
    const apply = (event: ChatEvent) => {
      if (event.type === "status") paint.status = event.label;
      else if (event.type === "citations") paint.citations = event.citations;
      else if (event.type === "step") {
        paint.rows = [...paint.rows, rowFromStep(event.step, paint.rows.length)];
        if (event.step.tool === "research" || event.step.tool === "web") paint.query = text || paint.query;
      } else if (event.type === "round") {
        paint.status = `Critic · round ${event.round}`;
        paint.debate = [...paint.debate, { round: event.round, critic: event.critic, verdict: event.verdict }];
        paint.rows = [
          ...paint.rows,
          { id: `critic-${event.round}`, kind: "step", primary: `Critic · round ${event.round}`, secondary: event.critic },
        ];
      } else if (event.type === "token") paint.text += event.text;
      else return;
      schedule();
    };

    try {
      const asked = agentText(text || "Read what I attached.", attachments);
      const result = subject
        ? await askAgent(asked, priorTurns(turns), subject, apply)
        : await askResearch(asked, apply);
      if (timer) window.clearTimeout(timer);
      const elapsedMs = Math.max(1, Date.now() - startedAt);
      setTurns((current) =>
        current.map((turn) =>
          turn.id === assistantId && turn.role === "assistant"
            ? {
                ...turn,
                text: result.text,
                status: "",
                warning: result.warning,
                reflection: result.reflection,
                confidence: result.confidence,
                debate: result.debate.length ? result.debate : paint.debate,
                running: false,
                elapsedMs,
                query: result.query ?? paint.query,
                rows: paint.rows.length ? paint.rows : result.rows,
                citations: result.citations.length ? result.citations : paint.citations,
              }
            : turn,
        ),
      );
    } catch (error) {
      if (timer) window.clearTimeout(timer);
      const message = error instanceof Error ? error.message : "The desk did not answer.";
      setTurns((current) =>
        current.map((turn) =>
          turn.id === assistantId && turn.role === "assistant"
            ? {
                ...turn,
                text: message,
                status: "",
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

  const ready = (note.trim().length > 0 || attachments.length > 0) && !running;
  const empty = turns.length === 0;

  const composer = (
    <div className="w-full">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          void addDroppedFiles(attachments, event.dataTransfer).then((result) => setAttachments(result.attachments));
        }}
        className={cn(
          "rounded-2xl border bg-panel transition-colors duration-200",
          over ? "border-gold" : "border-line",
        )}
      >
        {matter || attachments.length ? (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {matter ? (
              <span className="flex max-w-full items-center gap-1 rounded-full bg-elevated py-1 pr-1 pl-3 text-xs text-paper">
                <span className="truncate">{matter.ngo} · {matter.title}</span>
                <button
                  type="button"
                  aria-label={`Remove ${matter.title}`}
                  onClick={() => onMatter("")}
                  className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-hover hover:text-paper"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}
            <AttachmentChips
              attachments={attachments}
              disabled={running}
              onRemove={(id) => setAttachments((current) => current.filter((item) => item.id !== id))}
            />
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
          placeholder={matter ? `Ask about ${matter.title}` : "Attach a sanction, files, or a folder"}
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
          <ChatAttach attachments={attachments} disabled={running} onChange={setAttachments} />
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
                Attach a sanction, a file, or a folder. The desk reads what you attach, then searches the library. Nothing is emailed.
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
                    {turn.files.length ? (
                      <ul className="mt-2 space-y-1">
                        {turn.files.map((file) => (
                          <li key={`${file.kind}:${file.name}`} className="truncate text-xs text-muted">
                            {file.kind === "sanction" ? "Sanction" : "File"} · {file.name}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <article key={turn.id} className="max-w-3xl" aria-live="polite">
                    <div className="text-left" onClick={() => setFocusId(turn.id)}>
                      {turn.running && turn.status ? (
                        <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-gold uppercase">{turn.status}</p>
                      ) : null}
                      {turn.text ? (
                        <ChatProse text={turn.text} citations={turn.citations} streaming={turn.running} />
                      ) : turn.running ? null : (
                        <p className="text-sm text-muted">The desk did not answer.</p>
                      )}
                    </div>
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
  if (turn.running) return turn.status || "Thinking";
  const tools = turn.rows.filter((row) => row.kind === "tool").length;
  const search = turn.rows.some((row) => row.kind === "search");
  if (search && tools === 0) return "Searched the library";
  if (tools > 0 && turn.rows.every((row) => row.kind === "tool")) {
    return `Ran ${tools} tool${tools === 1 ? "" : "s"}`;
  }
  const seconds = Math.max(1, Math.round(turn.elapsedMs / 1000));
  return `Thought for ${seconds} second${seconds === 1 ? "" : "s"}`;
}

function priorTurns(turns: Turn[]) {
  const history: { role: "user" | "assistant"; text: string }[] = [];
  for (const turn of turns) {
    if (turn.role === "user") history.push({ role: "user", text: agentText(turn.text, turn.files.map((file) => ({ kind: file.kind, label: file.name }))) });
    else if (turn.text && !turn.running) history.push({ role: "assistant", text: turn.text });
  }
  return history;
}

async function askAgent(
  text: string,
  history: { role: "user" | "assistant"; text: string }[],
  matter: Matter,
  onEvent: (event: ChatEvent) => void,
) {
  const response = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [...history, { role: "user", text }],
      matter: toBrief(matter),
    }),
  });
  const data = await readChat(response, onEvent);
  return {
    text: data.text,
    warning: data.warning || "",
    reflection: data.reflection || "",
    confidence: data.confidence,
    debate: data.debate || [],
    query: (data.steps ?? []).some((step) => step.tool === "research") ? text : undefined,
    rows: rowsFromSteps(data.steps ?? []),
    citations: data.citations ?? [],
  };
}

async function askResearch(text: string, onEvent: (event: ChatEvent) => void) {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: text }),
  });
  const data = await readChat(response, onEvent);
  return {
    text: data.text,
    warning: data.warning || "",
    reflection: data.reflection || "",
    confidence: data.confidence,
    debate: data.debate || [],
    query: text,
    rows: [] as ActivityRow[],
    citations: data.citations ?? [],
  };
}

function rowFromStep(step: ChatStep, index: number): ActivityRow {
  if (step.tool === "research" || step.tool === "web") {
    return { id: `${step.tool}-${index}-${step.label}`, kind: "search", primary: step.label, secondary: step.detail, href: step.href };
  }
  if (step.tool === "read_document" || step.tool === "read_matter") {
    return { id: `${step.tool}-${index}`, kind: "tool", primary: step.label, secondary: step.detail, mono: true };
  }
  return { id: `${step.tool}-${index}`, kind: "step", primary: step.label, secondary: step.detail };
}

function rowsFromSteps(steps: ChatStep[]): ActivityRow[] {
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

function agentText(text: string, attachments: { kind: "sanction" | "file"; label: string }[]) {
  if (!attachments.length) return text;
  const labels = attachments.map((item) => `${item.kind === "sanction" ? "sanction" : "file"} ${item.label}`).join(", ");
  return `${text}\n\nAttached: ${labels}.`;
}

function mergeDocuments<T extends { name: string }>(files: T[]) {
  const seen = new Set<string>();
  return files
    .filter((file) => {
      const key = file.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 40);
}
