"use client";

import { useSyncExternalStore } from "react";
import { AGENT_MODELS, type AgentModelId, type RakazoMemory, type RakazoMessage, type RakazoRoutine, type RakazoState, type RakazoThread } from "./rakazo-types";

const KEY = "atrium-rakazo";

export const DEFAULT_ROUTINES: RakazoRoutine[] = [
  {
    id: "rank",
    label: "Rank capital",
    prompt: "Rank the capital book against this matter and say why the top matches fit.",
  },
  {
    id: "note",
    label: "Draft the lead note",
    prompt: "Draft an outreach note to the closest mandate. Do not send it.",
  },
  {
    id: "gaps",
    label: "Folder gaps",
    prompt: "What is in this folder, and what is still missing?",
  },
  {
    id: "research",
    label: "Research the theory",
    prompt: "Research the certification and damages theory for this matter from the source library.",
  },
];

const EMPTY: RakazoState = {
  threads: [seedThread()],
  activeId: "thread-desk",
  memory: [],
  routines: DEFAULT_ROUTINES,
  model: "default",
};

let memory: RakazoState = EMPTY;

if (typeof window !== "undefined") {
  memory = read();
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return memory;
}

function getServerSnapshot() {
  return EMPTY;
}

function write(next: RakazoState) {
  memory = next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

export function useRakazoDesk() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export type AgentRun = {
  running: boolean;
  prompt: string;
};

const IDLE_RUN: AgentRun = { running: false, prompt: "" };
let run: AgentRun = IDLE_RUN;
const runListeners = new Set<() => void>();

function subscribeRun(listener: () => void) {
  runListeners.add(listener);
  return () => runListeners.delete(listener);
}

export function useAgentRun() {
  return useSyncExternalStore(subscribeRun, () => run, () => IDLE_RUN);
}

export function setAgentRun(next: AgentRun) {
  run = next;
  for (const listener of runListeners) listener();
}

export function updateRakazo(recipe: (state: RakazoState) => RakazoState) {
  write(recipe(memory));
}

export function freshThread(): RakazoThread {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `thread-${Date.now()}`;
  return {
    id,
    title: "New conversation",
    matterId: "",
    messages: [],
    updated: new Date().toISOString(),
  };
}

export function openForwardedThread(input: { title: string; matterId: string; text: string }) {
  const next = freshThread();
  next.title = input.title.slice(0, 48);
  next.matterId = input.matterId;
  next.messages = [{ id: `${next.id}-forward`, role: "user", text: input.text }];
  updateRakazo((state) => ({
    ...state,
    threads: [next, ...state.threads].slice(0, 30),
    activeId: next.id,
  }));
}

function seedThread(): RakazoThread {
  return {
    id: "thread-desk",
    title: "New conversation",
    matterId: "",
    messages: [],
    updated: "",
  };
}

function read(): RakazoState {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || "");
    return normalize(raw);
  } catch {
    return EMPTY;
  }
}

function normalize(value: unknown): RakazoState {
  if (!value || typeof value !== "object") return EMPTY;
  const raw = value as Partial<RakazoState>;
  const threads = Array.isArray(raw.threads) ? raw.threads.flatMap(normalizeThread).slice(0, 30) : [];
  const routines = Array.isArray(raw.routines) ? raw.routines.flatMap(normalizeRoutine).slice(0, 8) : DEFAULT_ROUTINES;
  const nextThreads = threads.length ? threads : [seedThread()];
  const activeId = nextThreads.some((thread) => thread.id === raw.activeId) ? String(raw.activeId) : nextThreads[0].id;
  return {
    threads: nextThreads,
    activeId,
    memory: Array.isArray(raw.memory) ? raw.memory.flatMap(normalizeMemory).slice(0, 24) : [],
    routines,
    model: isModel(raw.model) ? raw.model : "default",
  };
}

function normalizeThread(value: unknown): RakazoThread[] {
  if (!value || typeof value !== "object") return [];
  const raw = value as RakazoThread;
  if (typeof raw.id !== "string" || !raw.id) return [];
  const messages = Array.isArray(raw.messages) ? raw.messages.filter(isMessage).slice(-80).map(cleanMessage) : [];
  return [
    {
      id: raw.id.slice(0, 80),
      title: typeof raw.title === "string" && raw.title.trim() ? raw.title.slice(0, 80) : "New conversation",
      matterId: typeof raw.matterId === "string" ? raw.matterId.slice(0, 80) : "",
      messages,
      updated: typeof raw.updated === "string" ? raw.updated : "",
    },
  ];
}

function isMessage(value: unknown): value is RakazoMessage {
  if (!value || typeof value !== "object") return false;
  const raw = value as { id?: unknown; role?: unknown; text?: unknown };
  return typeof raw.id === "string" && (raw.role === "user" || raw.role === "assistant") && typeof raw.text === "string";
}

function cleanMessage(message: RakazoMessage): RakazoMessage {
  const steps = Array.isArray(message.steps)
    ? message.steps.flatMap((step) => {
        if (!step || typeof step.tool !== "string" || typeof step.label !== "string") return [];
        return [{ tool: step.tool.slice(0, 40), label: step.label.slice(0, 80), detail: String(step.detail || "").slice(0, 240) }];
      })
    : undefined;
  return {
    id: message.id.slice(0, 80),
    role: message.role,
    text: message.text.slice(0, 8000),
    steps,
    source: message.source === "mistral" || message.source === "desk" ? message.source : undefined,
    model: typeof message.model === "string" ? message.model.slice(0, 80) : undefined,
    warning: typeof message.warning === "string" ? message.warning.slice(0, 240) : undefined,
    reflection: typeof message.reflection === "string" ? message.reflection.slice(0, 700) : undefined,
    confidence: typeof message.confidence === "number" ? Math.min(1, Math.max(0, message.confidence)) : undefined,
    debate: Array.isArray(message.debate)
      ? message.debate.flatMap((round) => {
          if (!round || typeof round.round !== "number" || typeof round.critic !== "string") return [];
          return [
            {
              round: round.round,
              critic: round.critic.slice(0, 500),
              verdict: round.verdict === "needs_revision" ? ("needs_revision" as const) : ("acceptable" as const),
            },
          ];
        })
      : undefined,
    citations: cleanCitations(message.citations),
    elapsedMs:
      typeof message.elapsedMs === "number" && message.elapsedMs >= 0
        ? Math.min(Math.round(message.elapsedMs), 30 * 60 * 1000)
        : undefined,
    attachments: cleanAttachments(message.attachments),
  };
}

function cleanAttachments(value: RakazoMessage["attachments"]) {
  if (!Array.isArray(value)) return undefined;
  const items = value.flatMap((item) => {
    if (!item || (item.kind !== "sanction" && item.kind !== "file") || typeof item.label !== "string" || !item.label.trim()) return [];
    return [{ kind: item.kind, label: item.label.trim().slice(0, 120) }];
  });
  return items.length ? items.slice(0, 20) : undefined;
}

function cleanCitations(value: RakazoMessage["citations"]) {
  if (!Array.isArray(value)) return undefined;
  const items = value.flatMap((item) => {
    if (!item || typeof item.n !== "number" || typeof item.title !== "string") return [];
    const origin = item.origin === "web" || item.origin === "folder" || item.origin === "library" ? item.origin : "library";
    const url = typeof item.url === "string" && /^https?:\/\//.test(item.url) ? item.url.slice(0, 400) : undefined;
    return [
      {
        n: Math.round(item.n),
        title: item.title.slice(0, 160),
        publisher: String(item.publisher || "").slice(0, 80),
        origin,
        excerpt: String(item.excerpt || "").slice(0, 500),
        url,
      },
    ];
  });
  return items.length ? items.slice(0, 10) : undefined;
}

function normalizeRoutine(value: unknown): RakazoRoutine[] {
  if (!value || typeof value !== "object") return [];
  const raw = value as RakazoRoutine;
  if (typeof raw.id !== "string" || typeof raw.label !== "string" || typeof raw.prompt !== "string") return [];
  if (!raw.prompt.trim()) return [];
  return [{ id: raw.id.slice(0, 80), label: raw.label.slice(0, 48), prompt: raw.prompt.slice(0, 400) }];
}

function normalizeMemory(value: unknown): RakazoMemory[] {
  if (!value || typeof value !== "object") return [];
  const raw = value as RakazoMemory;
  if (typeof raw.id !== "string" || typeof raw.note !== "string" || !raw.note.trim()) return [];
  return [{ id: raw.id.slice(0, 80), note: raw.note.slice(0, 280), at: typeof raw.at === "string" ? raw.at : "" }];
}

function isModel(value: unknown): value is AgentModelId {
  return AGENT_MODELS.some((item) => item.id === value);
}
