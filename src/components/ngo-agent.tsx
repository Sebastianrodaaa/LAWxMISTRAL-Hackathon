"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, ChevronDown, PanelLeft } from "lucide-react";
import { buildMatter } from "@/lib/build";
import { library } from "@/lib/library";
import { sanctionById } from "@/lib/sanctions";
import { AgentActivity } from "@/components/agent-activity";
import { addDroppedFiles, AttachmentChips, ChatAttach, documentsFromAttachments, type ChatAttachment } from "@/components/chat-attach";
import { ChatProse } from "@/components/chat-prose";
import type { ChatEvent } from "@/lib/chat-events";
import { readChat } from "@/lib/chat-stream";
import { AGENT_MODELS, type MatterBrief, type RakazoMessage } from "@/lib/rakazo-types";
import { DEFAULT_ROUTINES, freshThread, setAgentRun, updateRakazo, useRakazoDesk } from "@/lib/rakazo-desk";
import { useStore } from "@/lib/store";
import type { DocketFile, Matter } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTabs } from "@/components/sidebar-with-tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  const [attachedByThread, setAttachedByThread] = useState<Record<string, ChatAttachment[]>>({});
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [live, setLive] = useState<(RakazoMessage & { status: string }) | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const pickedMatter = matters.find((item) => item.id === picked) ?? matters[0];
  const thread = desk.threads.find((item) => item.id === desk.activeId) ?? desk.threads[0];
  const sanction = sanctionFromThread(thread?.matterId);
  const matter = sanction
    ? buildMatter(sanction.files, { id: sanction.id, origin: "desk", shared: false })
    : pickedMatter;
  const attached = thread ? attachedByThread[thread.id] ?? [] : [];
  const subject = conversationMatter(matter, attached);

  function setAttached(next: ChatAttachment[]) {
    if (!thread) return;
    setAttachedByThread((current) => ({ ...current, [thread.id]: next }));
  }

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [thread?.messages.length, busy, thread?.id, live?.text, live?.status]);

  async function send(raw: string) {
    const text = raw.trim();
    const pending = thread ? attachedByThread[thread.id] ?? [] : [];
    const reading = conversationMatter(matter, pending);
    if ((!text && !pending.length) || busy || !reading || !thread) return;
    setBusy(true);
    setAgentRun({ running: true, prompt: text.slice(0, 80) });
    setDraft("");
    if (pending.length) setAttached([]);
    const liveId = uid();
    const paint = {
      text: "",
      status: "Reading the folder",
      steps: [] as RakazoMessage["steps"],
      debate: [] as RakazoMessage["debate"],
      citations: [] as RakazoMessage["citations"],
    };
    let timer = 0;
    const show = () => {
      timer = 0;
      setLive({
        id: liveId,
        role: "assistant",
        text: paint.text,
        steps: paint.steps,
        debate: paint.debate,
        citations: paint.citations,
        status: paint.status,
      });
    };
    show();
    setFocusId(liveId);
    const schedule = () => {
      if (timer) return;
      timer = window.setTimeout(show, 0);
    };
    const asked = text || "Read what I attached.";
    const user: RakazoMessage = {
      id: uid(),
      role: "user",
      text: asked,
      attachments: pending.length ? pending.map((item) => ({ kind: item.kind, label: item.label })) : undefined,
    };
    const prior = thread.messages;
    const sanctionAttachment = pending.find((item) => item.kind === "sanction");
    updateRakazo((state) =>
      mapThread(state, thread.id, (current) => ({
        ...current,
        title: current.title === "New conversation" ? asked.slice(0, 48) : current.title,
        matterId: sanctionAttachment ? sanctionAttachment.id : current.matterId.startsWith("sanction:") ? current.matterId : reading.id,
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
          messages: [...prior, user].slice(-12).map((item) => ({ role: item.role, text: messageForAgent(item) })),
          matter: toBrief(reading),
        }),
      });
      const data = await readChat(response, (event: ChatEvent) => {
        if (event.type === "status") paint.status = event.label;
        else if (event.type === "citations") paint.citations = event.citations;
        else if (event.type === "step") paint.steps = [...(paint.steps ?? []), event.step];
        else if (event.type === "round") {
          paint.status = `Critic · round ${event.round}`;
          paint.debate = [...(paint.debate ?? []), { round: event.round, critic: event.critic, verdict: event.verdict }];
        } else if (event.type === "token") paint.text += event.text;
        else return;
        schedule();
      });
      if (timer) window.clearTimeout(timer);
      const assistant: RakazoMessage = {
        id: liveId,
        role: "assistant",
        text: data.text,
        steps: data.steps ?? paint.steps,
        source: data.source,
        model: data.model,
        warning: data.warning,
        reflection: data.reflection,
        confidence: data.confidence,
        debate: data.debate ?? paint.debate,
        citations: data.citations ?? paint.citations,
      };
      setLive(null);
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
      if (timer) window.clearTimeout(timer);
      setLive(null);
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

  const focused = (live && focusId === live.id ? live : undefined)
    ?? thread?.messages.find((item) => item.id === focusId && item.role === "assistant")
    ?? [...(thread?.messages ?? [])].reverse().find((item) => item.role === "assistant");

  if (!thread) {
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
      <header className="flex items-center justify-end gap-2 border-b border-line px-3 py-2 lg:hidden">
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
          <button type="button" className="h-9 cursor-pointer rounded-xl bg-elevated px-3 text-sm font-medium lg:hidden" onClick={() => setPanel(true)}>
            Computer
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className={`hidden shrink-0 flex-col border-x border-[#c6c6c8] bg-ink md:flex ${chatsOpen ? "w-56" : "w-12"}`}>
          <div className={`flex items-center gap-1 border-b border-[#c6c6c8] ${chatsOpen ? "p-2" : "justify-center p-1.5"}`}>
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
            {thread.messages.length === 0 && !live ? (
              <EmptyState title={subject?.title} ngo={subject?.ngo} onPick={(prompt) => void send(prompt)} />
            ) : (
            <ol className="mx-auto flex max-w-3xl flex-col gap-5">
                {thread.messages.map((message) => (
                  <li key={message.id}>
                    {message.role === "user" ? (
                      <div className="ml-auto max-w-xl rounded-2xl bg-fill px-3.5 py-2.5 text-sm leading-relaxed text-white">
                        <p className="whitespace-pre-wrap">{message.text}</p>
                        {message.attachments?.length ? (
                          <ul className="mt-2 space-y-1">
                            {message.attachments.map((item) => (
                              <li key={`${item.kind}:${item.label}`} className="truncate text-xs text-white/80">
                                {item.kind === "sanction" ? "Sanction" : "File"} · {item.label}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : (
                      <article>
                        <div className="text-left" onClick={() => setFocusId(message.id)}>
                          <ChatProse text={message.text} citations={message.citations} />
                        </div>
                      </article>
                    )}
                  </li>
                ))}
                {live ? (
                  <li>
                    <article aria-live="polite">
                      {live.status ? (
                        <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-gold uppercase">{live.status}</p>
                      ) : null}
                      <ChatProse text={live.text} citations={live.citations} streaming />
                    </article>
                  </li>
                ) : null}
              </ol>
            )}
          </div>
          <form
            className="px-3 pt-2 pb-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <div
              className={cn(
                "mx-auto max-w-3xl rounded-2xl border bg-panel transition-colors duration-200",
                over ? "border-gold" : "border-line",
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setOver(false);
                void addDroppedFiles(attached, event.dataTransfer).then((result) => setAttached(result.attachments));
              }}
            >
              {attached.length ? (
                <div className="px-3 pt-3">
                  <AttachmentChips attachments={attached} disabled={busy} onRemove={(id) => setAttached(attached.filter((item) => item.id !== id))} />
                </div>
              ) : null}
              <label className="block">
                <span className="sr-only">Message Rakazo</span>
                <textarea
                  value={draft}
                  maxLength={2000}
                  rows={2}
                  placeholder={subject ? `Ask about ${subject.title}` : "Attach a sanction, files, or a folder"}
                  disabled={busy}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send(draft);
                    }
                  }}
                  className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm leading-relaxed text-paper outline-none placeholder:text-faint"
                />
              </label>
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <div className="flex min-w-0 items-center gap-1">
                  <ChatAttach attachments={attached} disabled={busy} onChange={setAttached} />
                  <ModelPicker
                    model={desk.model}
                    onChange={(model) => updateRakazo((state) => ({ ...state, model }))}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="h-8 cursor-pointer rounded-lg px-2 text-xs text-muted hover:bg-elevated hover:text-paper disabled:opacity-40"
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
                      setDraft("");
                    }}
                  >
                    Save routine
                  </button>
                  <button
                    type="submit"
                    aria-label="Send"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-fill text-white transition-colors duration-200 hover:bg-fill-2 disabled:cursor-not-allowed disabled:bg-elevated disabled:text-faint"
                    disabled={busy || (!draft.trim() && !attached.length)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </section>

        <aside className="hidden w-80 shrink-0 flex-col border-l border-line bg-ink lg:flex">
          <Computer
            message={focused?.role === "assistant" ? focused : null}
            running={busy}
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
              message={focused?.role === "assistant" ? focused : null}
              running={busy}
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

function Computer({
  message,
  running,
  memory,
  routines,
  busy,
  onRun,
  onForget,
  onDropRoutine,
}: {
  message: (RakazoMessage & { status?: string }) | null;
  running: boolean;
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
        <AgentActivity key={message?.id ?? "idle"} message={message} running={running} />
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

function conversationMatter(open: Matter | undefined, attachments: ChatAttachment[]): Matter | undefined {
  if (!attachments.length) return open;
  const extra = documentsFromAttachments(attachments);
  const first = attachments.find((item) => item.kind === "sanction");
  const sanction = first?.kind === "sanction" ? sanctionById(first.sanctionId) : undefined;
  const base = sanction
    ? buildMatter(sanction.files, { id: `sanction:${sanction.id}`, origin: "desk", shared: false })
    : open ?? (extra.length ? buildMatter(extra, { origin: "desk", shared: false }) : undefined);
  if (!base) return undefined;
  const labels = attachments.map((item) => item.label).join(", ");
  return {
    ...base,
    summary: `Attached for this conversation: ${labels}. ${base.summary}`,
    documents: mergeDocuments(sanction ? extra : [...extra, ...base.documents]),
  };
}

function mergeDocuments(files: DocketFile[]) {
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

function messageForAgent(message: RakazoMessage) {
  if (!message.attachments?.length) return message.text;
  const labels = message.attachments.map((item) => `${item.kind === "sanction" ? "sanction" : "file"} ${item.label}`).join(", ");
  return `${message.text}\n\nAttached: ${labels}.`;
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

const MODEL_NOTES: Record<(typeof AGENT_MODELS)[number]["id"], string> = {
  default: "Balanced desk model",
  "mistral-medium-3-5": "Longer notes and closer reading",
  "mistral-small-latest": "Faster replies",
  "mistral-large-latest": "Harder research questions",
};

function ModelPicker({
  model,
  onChange,
}: {
  model: (typeof AGENT_MODELS)[number]["id"];
  onChange: (model: (typeof AGENT_MODELS)[number]["id"]) => void;
}) {
  const current = AGENT_MODELS.find((item) => item.id === model) ?? AGENT_MODELS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 max-w-40 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs text-muted hover:bg-elevated hover:text-paper">
        <span className="truncate">{current.label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-64">
        {AGENT_MODELS.map((item) => (
          <DropdownMenuItem key={item.id} className="items-start gap-2" onSelect={() => onChange(item.id)}>
            <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", item.id === model ? "text-gold" : "opacity-0")} />
            <span className="min-w-0">
              <span className="block text-sm">{item.label}</span>
              <span className="block text-xs text-muted">{MODEL_NOTES[item.id]}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({ title, ngo, onPick }: { title?: string; ngo?: string; onPick: (prompt: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col justify-center py-8">
      <p className="text-[13px] font-medium text-gold">Rakazo</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">What should I take first?</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {title
          ? `I stay on ${title}${ngo ? ` for ${ngo}` : ""}. I can read the folder, score mandates, draft a note, and search the source library.`
          : "Attach a sanction or a folder. I can read it, score mandates, draft a note, and search the source library."}{" "}
        Memory and routines stay in this browser.
      </p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {DEFAULT_ROUTINES.map((routine) => (
          <li key={routine.id}>
            <button
              type="button"
              className="h-full w-full cursor-pointer rounded-xl border border-line bg-panel px-3 py-2.5 text-left text-sm font-medium hover:bg-elevated"
              onClick={() => onPick(routine.prompt)}
            >
              {routine.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
