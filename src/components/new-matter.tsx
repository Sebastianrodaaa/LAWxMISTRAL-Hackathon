"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { agentTrace, buildMatter, wordCount } from "@/lib/build";
import { riverbendFiles } from "@/lib/dockets";
import { useStore } from "@/lib/store";
import type { DocketFile, Matter, TraceStep } from "@/lib/types";
import { Kicker, primaryLink } from "./ui";

const TEXT = new Set(["txt", "md", "markdown", "csv", "json", "html", "htm"]);

export function NewMatter() {
  const { addDraft } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<DocketFile[]>([]);
  const [over, setOver] = useState(false);
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [done, setDone] = useState<{ id: string; source: string; gaps: string[] } | null>(null);

  useEffect(() => {
    folderRef.current?.setAttribute("webkitdirectory", "");
    folderRef.current?.setAttribute("directory", "");
  }, []);

  async function take(list: File[]) {
    const next = await Promise.all(list.slice(0, 40).map(readOne));
    const clean = next.filter((file): file is DocketFile => Boolean(file));
    setFiles(clean);
    setDone(null);
    setSteps([]);
    setNotice(list.length > 40 ? "Only the first 40 files were kept." : "");
  }

  async function run() {
    if (!files.length || running) return;
    setRunning(true);
    setDone(null);
    setSteps([]);
    const local = buildMatter(files, { origin: "desk", shared: false });
    const trace = agentTrace(local, wordCount(files));
    const pending = fetch("/api/pitch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .catch(() => null);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const step of trace) {
      setSteps((current) => [...current, step]);
      if (!reduce) await wait(680);
    }
    const payload = (await pending) as { source?: string; matter?: Matter } | null;
    const matter = mergeMatter(local, payload);
    addDraft(matter);
    setDone({
      id: matter.id,
      source: payload?.source === "mistral" ? "mistral" : "desk",
      gaps: matter.gaps,
    });
    setRunning(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <Kicker n="02">Folder to deck</Kicker>
      <h1 className="mt-3 max-w-3xl font-serif text-4xl tracking-tight md:text-6xl">
        Point the agent at the file.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
        Drop a folder of pleadings, notices, and damages notes. The desk reads a caption sheet if you have one, indexes everything else, and leaves missing figures missing. Load the Riverbend sample to see a finished docket run.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
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
            className={`border border-dashed p-5 transition-colors duration-200 ${over ? "border-gold bg-panel" : "border-line"}`}
          >
            <p className="font-serif text-2xl">The folder</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Text files are read. Other files are indexed and not parsed. Nothing is uploaded until you run the desk, and then only to compose the deck.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="h-10 cursor-pointer border border-line px-3 text-sm hover:border-gold">
                Choose files
              </button>
              <button type="button" onClick={() => folderRef.current?.click()} className="h-10 cursor-pointer border border-line px-3 text-sm hover:border-gold">
                Choose a folder
              </button>
              <button
                type="button"
                onClick={() => {
                  setFiles(riverbendFiles);
                  setDone(null);
                  setSteps([]);
                  setNotice("Riverbend sample loaded. It is already circulating; this run makes your own draft.");
                }}
                className="h-10 cursor-pointer border border-line px-3 text-sm hover:border-gold"
              >
                Load Riverbend sample
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              aria-label="Choose files"
              className="sr-only"
              onChange={(event) => {
                void take([...(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />
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
          </div>
          {notice ? <p className="mt-3 text-sm text-muted">{notice}</p> : null}
          {files.length ? (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {files.map((file) => (
                <li key={file.name} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                    {file.kind}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() => void run()}
            disabled={!files.length || running}
            className="mt-4 h-11 cursor-pointer bg-gold px-4 text-sm font-bold text-ink transition-colors duration-200 hover:bg-gold-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? "Reading the folder…" : "Run the desk"}
          </button>
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">Agent trace</p>
          <ol className="mt-4 space-y-3" aria-live="polite">
            {steps.map((step, index) => (
              <li key={step.id} className="border-l border-gold pl-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
                  {String(index + 1).padStart(2, "0")} {step.label}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-paper">{step.detail}</p>
              </li>
            ))}
            {!steps.length ? (
              <li className="text-sm leading-relaxed text-muted">
                The trace will show the inventory, the parties, the class, the theories, the damages worksheet, and the slide count. It appears as each pass finishes.
              </li>
            ) : null}
          </ol>
          {done ? (
            <div className="mt-6 border border-line bg-panel p-4">
              <p className="text-sm leading-relaxed text-paper">
                {done.source === "mistral"
                  ? "Mistral rewrote the narrative from the folder. Figures still come from the caption sheet."
                  : "The desk composed the narrative from the folder. Set MISTRAL_API_KEY and the same run will ask Mistral to rewrite the prose."}
              </p>
              {done.gaps.length ? (
                <p className="mt-2 text-sm text-warn">Marked as missing: {done.gaps.join(", ")}.</p>
              ) : null}
              <Link href={`/desk/cases/${done.id}`} className={`${primaryLink} mt-4`}>
                Open the deck
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
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
