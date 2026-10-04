"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, FolderOpen, Paperclip, X } from "lucide-react";
import { agentTrace, buildMatter, wordCount } from "@/lib/build";
import { riverbendFiles } from "@/lib/dockets";
import { funds, fundById } from "@/lib/funds";
import { rankFunds } from "@/lib/match";
import { useStore } from "@/lib/store";
import type { DocketFile, Matter, Sanction, TraceStep } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Deck } from "./deck";
import { HarnessNote, type HarnessDebate } from "./harness-note";
import { primaryLink } from "./ui";

const TEXT = new Set(["txt", "md", "markdown", "csv", "json", "html", "htm"]);

type UserTurn = {
  id: string;
  role: "user";
  files: { name: string; kind: string }[];
  note: string;
};

type AssistantTurn = {
  id: string;
  role: "assistant";
  steps: TraceStep[];
  matter: Matter | null;
  source: string;
  note: string;
  warning: string;
  reflection: string;
  confidence?: number;
  debate: HarnessDebate[];
  running: boolean;
};

type Turn = UserTurn | AssistantTurn;

export function NewMatter({ sanction = null, nonce = 0 }: { sanction?: Sanction | null; nonce?: number }) {
  const { addDraft } = useStore();
  const folderRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const turnCount = useRef(0);
  const [files, setFiles] = useState<DocketFile[]>([]);
  const [note, setNote] = useState("");
  const [over, setOver] = useState(false);
  const [notice, setNotice] = useState("");
  const [running, setRunning] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [applied, setApplied] = useState(0);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 60, maxHeight: 200 });

  if (sanction && nonce > 0 && nonce !== applied) {
    setApplied(nonce);
    setFiles(sanction.files);
    setNotice(`Forwarded from the sanctions feed: ${sanction.title}. The summary is the folder. Add a note, then generate.`);
  }

  useEffect(() => {
    folderRef.current?.setAttribute("webkitdirectory", "");
    folderRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  async function take(list: File[]) {
    const next = await Promise.all(list.slice(0, 40).map(readOne));
    const clean = next.filter((file): file is DocketFile => Boolean(file));
    setFiles(clean);
    setNotice(list.length > 40 ? "Only the first 40 files were kept." : "");
  }

  function loadSample() {
    setFiles(riverbendFiles);
    setNotice("Riverbend sample loaded. It is already circulating; this run makes your own draft.");
  }

  function removeFile(name: string) {
    setFiles((current) => current.filter((file) => file.name !== name));
    setNotice("");
  }

  async function send() {
    const folder = files;
    const emphasis = note.trim();
    if (!folder.length || running) return;
    turnCount.current += 1;
    const userId = `turn-${turnCount.current}`;
    turnCount.current += 1;
    const assistantId = `turn-${turnCount.current}`;
    setTurns((current) => [
      ...current,
      {
        id: userId,
        role: "user",
        files: folder.map((file) => ({ name: file.name, kind: file.kind })),
        note: emphasis,
      },
      { id: assistantId, role: "assistant", steps: [], matter: null, source: "", note: emphasis, warning: "", reflection: "", debate: [], running: true },
    ]);
    setFiles([]);
    setNote("");
    setNotice("");
    adjustHeight(true);
    setRunning(true);

    const local = buildMatter(folder, { origin: "desk", shared: false });
    const trace = agentTrace(local, wordCount(folder));
    const pending = fetch("/api/pitch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: folder, note: emphasis }),
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .catch(() => null);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const step of trace) {
      setTurns((current) =>
        current.map((turn) =>
          turn.id === assistantId && turn.role === "assistant"
            ? { ...turn, steps: [...turn.steps, step] }
            : turn,
        ),
      );
      if (!reduce) await wait(680);
    }
    const payload = (await pending) as {
      source?: string;
      matter?: Matter;
      warning?: string;
      reflection?: string;
      confidence?: number;
      debate?: HarnessDebate[];
    } | null;
    const matter = mergeMatter(local, payload);
    const warning = typeof payload?.warning === "string" ? payload.warning : "";
    addDraft(matter);
    setTurns((current) =>
      current.map((turn) =>
        turn.id === assistantId && turn.role === "assistant"
          ? {
              ...turn,
              matter,
              source: payload?.source === "mistral" ? "mistral" : "desk",
              warning,
              reflection: payload?.reflection || "",
              confidence: payload?.confidence,
              debate: payload?.debate || [],
              running: false,
            }
          : turn,
      ),
    );
    setRunning(false);
  }

  const ready = files.length > 0 && !running;
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
          void filesFromTransfer(event.dataTransfer).then(take);
        }}
        className={cn(
          "rounded-2xl border bg-panel transition-colors duration-200",
          over ? "border-gold" : "border-line",
        )}
      >
        {files.length ? (
          <ul className="flex flex-wrap gap-2 px-3 pt-3">
            {files.map((file) => (
              <li key={file.name} className="flex max-w-full items-center gap-1 rounded-full bg-elevated py-1 pr-1 pl-3 text-xs text-paper">
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeFile(file.name)}
                  className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-hover hover:text-paper"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label className="sr-only" htmlFor="desk-note">
          Note for the writing pass
        </label>
        <textarea
          id="desk-note"
          ref={textareaRef}
          value={note}
          rows={1}
          placeholder="Add a note, or just drop the folder"
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
          <button
            type="button"
            onClick={() => folderRef.current?.click()}
            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-muted transition-colors duration-200 hover:bg-elevated hover:text-paper"
          >
            <Paperclip className="h-4 w-4" />
            <span className="text-xs">Folder</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSample}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-dashed border-line px-2 py-1 text-sm text-muted transition-colors duration-200 hover:bg-elevated hover:text-paper"
            >
              <FolderOpen className="h-4 w-4" />
              Sample
            </button>
            <button
              type="button"
              onClick={() => void send()}
              disabled={!ready}
              aria-label="Generate the pitch"
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
      <input
        ref={folderRef}
        type="file"
        multiple
        aria-label="Choose a folder"
        className="sr-only"
        onChange={(event) => {
          void take([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
      {notice ? <p className="mt-3 text-sm text-muted">{notice}</p> : null}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("min-h-0 flex-1", empty ? "flex items-center" : "overflow-y-auto")}>
        {empty ? (
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-10">
            <h1 className="text-center font-serif text-4xl tracking-tight text-paper">
              Drop a folder. Leave with a pitch.
            </h1>
            <p className="mt-3 max-w-xl text-center text-sm leading-relaxed text-muted">
              Text files are read. Other files are indexed and not parsed. Missing figures stay missing.
            </p>
            <div className="mt-8 w-full">{composer}</div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
            {turns.map((turn) =>
              turn.role === "user" ? (
                <div key={turn.id} className="ml-auto max-w-[85%] rounded-2xl bg-elevated px-4 py-3">
                  <p className="text-sm leading-relaxed text-paper">{turn.note || "Read this folder."}</p>
                  <ul className="mt-2 space-y-1">
                    {turn.files.map((file) => (
                      <li key={file.name} className="truncate text-xs text-muted">
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <AssistantReply key={turn.id} turn={turn} />
              ),
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>
      {empty ? null : <div className="mx-auto w-full max-w-3xl px-4 pt-2 pb-4">{composer}</div>}
    </div>
  );
}

function AssistantReply({ turn }: { turn: AssistantTurn }) {
  const { drafts, deliveries, listMatter, sendToInvestors } = useStore();
  const matter = turn.matter;
  const listed = matter ? drafts.some((item) => item.id === matter.id && item.shared) : false;
  const sent = matter ? deliveries.filter((item) => item.matterId === matter.id) : [];
  const targets = matter ? rankFunds(matter, funds).slice(0, 3) : [];

  return (
    <div className="max-w-3xl" aria-live="polite">
      <ol className="space-y-3">
        {turn.steps.map((step, index) => (
          <li key={step.id} className="border-l border-gold pl-4">
            <p className="text-[11px] font-medium tracking-[0.14em] text-gold uppercase">
              {String(index + 1).padStart(2, "0")} {step.label}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-paper">{step.detail}</p>
          </li>
        ))}
        {turn.running && !turn.steps.length ? (
          <li className="text-sm text-muted">Reading the folder…</li>
        ) : null}
      </ol>
      {turn.matter ? (
        <div className="mt-6">
          <p className="text-sm leading-relaxed text-paper">{replyCopy(turn.source, turn.note, turn.warning)}</p>
          {turn.warning ? <p className="mt-2 text-sm text-warn">{turn.warning}</p> : null}
          <HarnessNote reflection={turn.reflection} confidence={turn.confidence} debate={turn.debate} />
          {turn.matter.gaps.length ? (
            <p className="mt-2 text-sm text-warn">Marked as missing: {turn.matter.gaps.join(", ")}.</p>
          ) : null}
          <div className="mt-4">
            <Deck slides={turn.matter.slides} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/desk/cases/${turn.matter.id}`} className={primaryLink}>
              Open the deck
            </Link>
            <button
              type="button"
              className="h-11 cursor-pointer rounded-xl bg-elevated px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              disabled={listed}
              onClick={() => listMatter(turn.matter!.id)}
            >
              {listed ? "On the investor feed" : "Publish to the investor feed"}
            </button>
            <button
              type="button"
              className="h-11 cursor-pointer rounded-xl bg-elevated px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              disabled={sent.length > 0}
              onClick={() => sendToInvestors(turn.matter!.id, targets.map((match) => match.fund.id))}
            >
              {sent.length ? "Sent to investors" : "Send to investors"}
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {sent.length
              ? `On the investor feed, marked for ${sent.map((item) => fundById(item.fundId).name).join(", ")}. Nothing was emailed.`
              : `Send marks this pitch for ${targets.map((match) => match.fund.name).join(", ")} and publishes it. Nothing is emailed.`}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function replyCopy(source: string, note: string, warning: string) {
  if (source === "mistral") {
    return note
      ? "The scholar rewrote the narrative from the folder, and the critic checked it. The note was emphasis only. Figures still come from the caption sheet."
      : "The scholar rewrote the narrative from the folder, and the critic checked it. Figures still come from the caption sheet.";
  }
  if (warning) {
    return "The desk kept the folder draft. Figures still come from the caption sheet.";
  }
  return note
    ? "The desk composed the narrative from the folder. The note stays on the transcript. Set MISTRAL_API_KEY and the same run will ask Mistral to rewrite the prose, using the note only as emphasis."
    : "The desk composed the narrative from the folder. Set MISTRAL_API_KEY and the same run will ask Mistral to rewrite the prose.";
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

function mergeMatter(local: Matter, payload: { source?: string; matter?: Matter } | null) {
  if (!payload?.matter?.slides?.length) return local;
  return {
    ...payload.matter,
    id: local.id,
    origin: "desk" as const,
    shared: false,
    documents: local.documents,
  };
}

async function readOne(file: File): Promise<DocketFile | null> {
  if (!file.name || file.name.startsWith(".")) return null;
  const kind = file.name.split(".").pop()?.toLowerCase() || "file";
  if (TEXT.has(kind) && file.size < 1_500_000) {
    const text = (await file.text()).slice(0, 20000);
    return { name: file.name, kind, text };
  }
  return {
    name: file.name,
    kind,
    text: `Exhibit index entry only. ${file.name} is ${file.size.toLocaleString()} bytes and was not read as text.`,
  };
}

async function filesFromTransfer(transfer: DataTransfer): Promise<File[]> {
  const entries = [...transfer.items]
    .map((item) => item.webkitGetAsEntry?.() ?? null)
    .filter((entry): entry is FileSystemEntry => Boolean(entry));
  if (!entries.length) return [...transfer.files];
  const files: File[] = [];
  const walk = async (entry: FileSystemEntry) => {
    if (files.length >= 40) return;
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      files.push(file);
      return;
    }
    if (!entry.isDirectory) return;
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    let batch: FileSystemEntry[] = [];
    do {
      batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      for (const child of batch) await walk(child);
    } while (batch.length && files.length < 40);
  };
  for (const entry of entries) await walk(entry);
  return files;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
