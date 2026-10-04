"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PanelLeft } from "lucide-react";
import { buildMatter } from "@/lib/build";
import { library } from "@/lib/library";
import { money } from "@/lib/format";
import { sanctionById } from "@/lib/sanctions";
import { AgentActivity } from "@/components/agent-activity";
import { HarnessNote } from "@/components/harness-note";
import { AGENT_MODELS, type MatterBrief, type RakazoMessage } from "@/lib/rakazo-types";
import { DEFAULT_ROUTINES, freshThread, setAgentRun, updateRakazo, useRakazoDesk } from "@/lib/rakazo-desk";
import { useStore } from "@/lib/store";
import type { Matter } from "@/lib/types";
import { useTabs } from "@/components/sidebar-with-tabs";

export function NgoAgent({ matterId }: { matterId?: string; onMatter: (id: string) => void }) {
  const { drafts } = useStore();
  const { setActiveNav } = useTabs();
  const desk = useRakazoDesk();
  const matters = useMemo(
    () => [...drafts, ...library.filter((matter) => !drafts.some((draft) => draft.id === matter.id))],
    [drafts],
  );
  const [picked, setPicked] = useState(matterId && matters.some((matter) => matter.id === matterId) ? matterId : matters[0]?.id ?? "");
  const [trackedMatter, setTrackedMatter] = useState(matterId);
  if (matterId && matterId !== trackedMatter && matters.some((item) => item.id === matterId)) {
    setTrackedMatter(matterId);
    setPicked(matterId);
  }
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [panel, setPanel] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [focusId, setFocusId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const pickedMatter = matters.find((item) => item.id === picked) ?? matters[0];
  const thread = desk.threads.find((item) => item.id === desk.activeId) ?? desk.threads[0];
  const sanction = sanctionFromThread(thread?.matterId);
  const matter = sanction
    ? buildMatter(sanction.files, { id: sanction.id, origin: "desk", shared: false })
    : pickedMatter;

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [thread?.messages.length, busy, thread?.id]);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy || !matter || !thread) return;
    setBusy(true);
    setAgentRun({ running: true, prompt: text.slice(0, 80) });
    setDraft("");
    const user: RakazoMessage = { id: uid(), role: "user", text };
    const prior = thread.messages;
    updateRakazo((state) =>
      mapThread(state, thread.id, (current) => ({
        ...current,
        title: current.title === "New conversation" ? text.slice(0, 48) : current.title,
        matterId: current.matterId.startsWith("sanction:") ? current.matterId : matter.id,
        updated: new Date().toISOString(),
        messages: [...current.messages, user].slice(-80),
      })),
    );

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: desk.model,
          memory: desk.memory.map((item) => item.note),
          messages: [...prior, user].slice(-12).map((item) => ({ role: item.role, text: item.text })),
          matter: toBrief(matter),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        text?: string;
        steps?: RakazoMessage["steps"];
        source?: RakazoMessage["source"];
        model?: string;
        warning?: string;
        memories?: string[];
        reflection?: string;
        confidence?: number;
        debate?: RakazoMessage["debate"];
      };
      if (!response.ok || !data.text) throw new Error(data.error || "Rakazo did not answer.");
      const assistant: RakazoMessage = {
        id: uid(),
        role: "assistant",
        text: data.text,
        steps: data.steps,
        source: data.source,
        model: data.model,
        warning: data.warning,
        reflection: data.reflection,
        confidence: data.confidence,
        debate: data.debate,
      };
      setFocusId(assistant.id);
      updateRakazo((state) => {
        const withReply = mapThread(state, thread.id, (current) => ({
          ...current,
          updated: new Date().toISOString(),
          messages: [...current.messages, assistant].slice(-80),
        }));
        const notes = (data.memories ?? []).map((note) => note.trim()).filter(Boolean);
        if (!notes.length) return withReply;
        const seen = new Set(withReply.memory.map((item) => item.note));
        const added = notes
          .filter((note) => !seen.has(note))
          .slice(0, 3)
          .map((note) => ({ id: uid(), note: note.slice(0, 280), at: new Date().toISOString() }));
        return { ...withReply, memory: [...added, ...withReply.memory].slice(0, 24) };
      });
    } catch (error) {
      const assistant: RakazoMessage = {
        id: uid(),
        role: "assistant",
        text: error instanceof Error ? error.message : "Rakazo did not answer.",
        source: "desk",
      };
      updateRakazo((state) =>
        mapThread(state, thread.id, (current) => ({
          ...current,
          messages: [...current.messages, assistant].slice(-80),
        })),
      );
    } finally {
      setAgentRun({ running: false, prompt: "" });
      setBusy(false);
    }
  }

  const focused = thread?.messages.find((item) => item.id === focusId && item.role === "assistant")
    ?? [...(thread?.messages ?? [])].reverse().find((item) => item.role === "assistant");

  if (!matter || !thread) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md">
          <h1 className="font-serif text-3xl">No matter on the desk yet.</h1>
          <button type="button" className="mt-4 h-10 cursor-pointer rounded-xl bg-fill px-3 text-sm font-semibold text-white" onClick={() => setActiveNav("generate")}>
            Generate a pitch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex items-center justify-end gap-2 border-b border-line px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <label className="min-w-36 md:hidden">
            <span className="sr-only">Conversation</span>
            <select
              value={thread.id}
              onChange={(event) => updateRakazo((state) => ({ ...state, activeId: event.target.value }))}
              className={selectClass}
            >
              {desk.threads.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-32">
            <span className="sr-only">Model</span>
            <select
              value={desk.model}
              onChange={(event) =>
                updateRakazo((state) => ({
                  ...state,
                  model: AGENT_MODELS.some((item) => item.id === event.target.value) ? (event.target.value as typeof desk.model) : "default",
                }))
              }
              className={selectClass}
            >
              {AGENT_MODELS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="h-9 cursor-pointer rounded-xl bg-elevated px-3 text-sm font-medium lg:hidden" onClick={() => setPanel(true)}>
            Computer
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className={`hidden shrink-0 flex-col border-r border-line bg-ink md:flex ${chatsOpen ? "w-56" : "w-12"}`}>
          <div className={`flex items-center gap-1 ${chatsOpen ? "p-2" : "justify-center p-1.5"}`}>
            {chatsOpen ? (
              <button
                type="button"
                className="h-9 min-w-0 flex-1 cursor-pointer rounded-xl bg-paper text-sm font-medium text-white"
                onClick={() => {
                  const next = freshThread();
                  updateRakazo((state) => ({ ...state, threads: [next, ...state.threads].slice(0, 30), activeId: next.id }));
                  setFocusId(null);
                }}
              >
                New conversation
              </button>
            ) : null}
            <button
              type="button"
              aria-label={chatsOpen ? "Close conversations" : "Open conversations"}
              aria-expanded={chatsOpen}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-elevated"
              onClick={() => setChatsOpen((open) => !open)}
            >
              <PanelLeft className={`h-4 w-4 ${chatsOpen ? "" : "rotate-180"}`} />
            </button>
          </div>
          {chatsOpen ? (
          <ul className="min-h-0 flex-1 space-y-1 overflow-auto px-2 pb-2" aria-label="Conversations">
            {desk.threads.map((item) => {
              const active = item.id === thread.id;
              const matterTitle = sanctionFromThread(item.matterId)?.title ?? matters.find((row) => row.id === item.matterId)?.title;
              return (
                <li key={item.id}>
                  <div className={`group flex items-start gap-1 rounded-xl px-2 py-2 ${active ? "bg-elevated" : "hover:bg-elevated"}`}>
                    <button type="button" className="min-w-0 flex-1 cursor-pointer text-left" onClick={() => updateRakazo((state) => ({ ...state, activeId: item.id }))}>
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-faint">{matterTitle || "No matter yet"}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${item.title}`}
                      className="cursor-pointer px-1 text-xs text-faint"
                      onClick={() => removeThread(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          ) : null}
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div ref={logRef} className="min-h-0 flex-1 overflow-auto px-4 py-4" role="log" aria-live="polite" aria-relevant="additions">
            {thread.messages.length === 0 ? (
              <EmptyState matter={matter} onPick={(prompt) => void send(prompt)} />
            ) : (
              <ol className="mx-auto flex max-w-3xl flex-col gap-5">
                {thread.messages.map((message) => (
                  <li key={message.id}>
                    {message.role === "user" ? (
                      <p className="ml-auto max-w-xl rounded-2xl bg-fill px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white">{message.text}</p>
                    ) : (
                      <article>
                        <button type="button" className="cursor-pointer text-left" onClick={() => setFocusId(message.id)}>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                        </button>
                        {message.steps?.length ? (
                          <ul className="mt-3 space-y-1">
                            {message.steps.map((step, index) => (
                              <li key={`${step.tool}-${index}`} className="rounded-lg bg-ink px-2.5 py-1.5 text-xs">
                                <span className="font-medium">{step.label}</span>
                                <span className="text-faint"> · {step.detail}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <p className="text-[11px] text-faint">{messageLabel(message)}</p>
                          {message.warning ? <p className="text-[11px] text-warn">{message.warning}</p> : null}
                          <button
                            type="button"
                            className="cursor-pointer text-[11px] font-medium text-gold"
                            onClick={() => {
                              void navigator.clipboard.writeText(message.text);
                              setCopied(message.id);
                            }}
                          >
                            {copied === message.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <HarnessNote
                          reflection={message.reflection}
                          confidence={message.confidence}
                          debate={message.debate}
                        />
                      </article>
                    )}
                  </li>
                ))}
                {busy ? <li className="text-sm text-muted">On the computer…</li> : null}
              </ol>
            )}
          </div>
          <form
            className="border-t border-line px-3 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <div className="mx-auto max-w-3xl">
              <label className="block">
                <span className="sr-only">Message Rakazo</span>
                <textarea
                  value={draft}
                  maxLength={2000}
                  rows={3}
                  placeholder={`Ask about ${matter.title}`}
                  disabled={busy}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send(draft);
                    }
                  }}
                  className="w-full resize-none rounded-2xl bg-elevated px-3 py-2.5 text-sm leading-relaxed outline-none"
                />
              </label>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-[11px] text-faint">Enter to send. Nothing is emailed. Ask {money(matter.assumptions.fundingAsk)}.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="h-9 cursor-pointer rounded-xl px-3 text-sm text-muted disabled:opacity-40"
                    disabled={!draft.trim() || desk.routines.length >= 8}
                    onClick={() => {
                      const prompt = draft.trim();
                      if (!prompt) return;
                      updateRakazo((state) => ({
                        ...state,
                        routines: [
                          ...state.routines,
                          { id: uid(), label: prompt.slice(0, 32), prompt: prompt.slice(0, 400) },
                        ].slice(0, 8),
                      }));
                    }}
                  >
                    Save routine
                  </button>
                  <button type="submit" className="h-9 cursor-pointer rounded-xl bg-fill px-3 text-sm font-semibold text-white disabled:opacity-40" disabled={busy || !draft.trim()}>
                    Send
                  </button>
                </div>
              </div>
            </div>
          </form>
        </section>

        <aside className="hidden w-80 shrink-0 flex-col border-l border-line bg-ink lg:flex">
          <Computer
            steps={focused?.steps ?? []}
            memory={desk.memory}
            routines={desk.routines}
            busy={busy}
            onRun={(prompt) => void send(prompt)}
            onForget={(id) => updateRakazo((state) => ({ ...state, memory: state.memory.filter((item) => item.id !== id) }))}
            onDropRoutine={(id) => updateRakazo((state) => ({ ...state, routines: state.routines.filter((item) => item.id !== id) }))}
          />
        </aside>
      </div>

      {panel ? (
        <div className="absolute inset-0 z-20 flex justify-end bg-black/20 lg:hidden" onClick={() => setPanel(false)}>
          <div className="flex h-full w-80 max-w-full flex-col bg-ink shadow-xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Computer">
            <div className="flex justify-end border-b border-line px-2 py-1">
              <button type="button" className="h-9 cursor-pointer px-2 text-sm" onClick={() => setPanel(false)}>
                Close
              </button>
            </div>
            <Computer
              steps={focused?.steps ?? []}
              memory={desk.memory}
              routines={desk.routines}
              busy={busy}
              onRun={(prompt) => {
                setPanel(false);
                void send(prompt);
              }}
              onForget={(id) => updateRakazo((state) => ({ ...state, memory: state.memory.filter((item) => item.id !== id) }))}
              onDropRoutine={(id) => updateRakazo((state) => ({ ...state, routines: state.routines.filter((item) => item.id !== id) }))}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ matter, onPick }: { matter: Matter; onPick: (prompt: string) => void }) {
  return (
    <div className="mx-auto max-w-lg pt-6">
      <p className="text-[13px] font-medium text-gold">Rakazo</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">What should I take first?</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        I stay on {matter.title} for {matter.ngo}. I can read the folder, score mandates, draft a note, and search the source library. Memory and routines stay in this browser.
      </p>
      <ul className="mt-5 space-y-2">
        {DEFAULT_ROUTINES.map((routine) => (
          <li key={routine.id}>
            <button type="button" className="w-full cursor-pointer rounded-xl bg-elevated px-3 py-3 text-left text-sm font-medium hover:bg-hover" onClick={() => onPick(routine.prompt)}>
              {routine.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Computer({
  steps,
  memory,
  routines,
  busy,
  onRun,
  onForget,
  onDropRoutine,
}: {
  steps: NonNullable<RakazoMessage["steps"]>;
  memory: { id: string; note: string }[];
  routines: { id: string; label: string; prompt: string }[];
  busy: boolean;
  onRun: (prompt: string) => void;
  onForget: (id: string) => void;
  onDropRoutine: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="border-b border-line p-3">
        <AgentActivity steps={steps} />
      </div>
      <section className="border-b border-line p-3">
        <h2 className="text-[13px] font-medium">Memory</h2>
        {memory.length ? (
          <ul className="mt-2 space-y-2">
            {memory.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-2">
                <p className="text-sm leading-relaxed">{item.note}</p>
                <button type="button" className="shrink-0 cursor-pointer text-[11px] text-faint" onClick={() => onForget(item.id)}>
                  Forget
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Ask Rakazo to remember a note.</p>
        )}
      </section>
      <section className="p-3">
        <h2 className="text-[13px] font-medium">Routines</h2>
        {routines.length ? (
          <ul className="mt-2 space-y-2">
            {routines.map((routine) => (
              <li key={routine.id} className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm">{routine.label}</p>
                <span className="flex shrink-0 gap-2">
                  <button type="button" aria-label={`Run ${routine.label}`} className="cursor-pointer text-[11px] font-medium text-gold disabled:opacity-40" disabled={busy} onClick={() => onRun(routine.prompt)}>
                    Run
                  </button>
                  <button type="button" className="cursor-pointer text-[11px] text-faint" onClick={() => onDropRoutine(routine.id)}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Save a message as a routine.</p>
        )}
      </section>
    </div>
  );
}

function sanctionFromThread(matterId: string | undefined) {
  if (!matterId?.startsWith("sanction:")) return undefined;
  return sanctionById(matterId.slice("sanction:".length));
}

function messageLabel(message: RakazoMessage) {
  if (message.source === "mistral") {
    return AGENT_MODELS.find((item) => item.id === message.model)?.label ?? "Mistral";
  }
  return "Desk";
}

function toBrief(matter: Matter): MatterBrief {
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

function mapThread(state: ReturnType<typeof useRakazoDesk>, id: string, recipe: (thread: (typeof state.threads)[number]) => (typeof state.threads)[number]) {
  return {
    ...state,
    threads: state.threads.map((thread) => (thread.id === id ? recipe(thread) : thread)),
  };
}

function removeThread(id: string) {
  updateRakazo((state) => {
    const threads = state.threads.filter((thread) => thread.id !== id);
    if (!threads.length) {
      const next = freshThread();
      return { ...state, threads: [next], activeId: next.id };
    }
    return {
      ...state,
      threads,
      activeId: state.activeId === id ? threads[0].id : state.activeId,
    };
  });
}

function uid() {
  return crypto.randomUUID();
}

const selectClass = "h-9 w-full cursor-pointer rounded-xl border border-transparent bg-elevated px-3 text-sm";
