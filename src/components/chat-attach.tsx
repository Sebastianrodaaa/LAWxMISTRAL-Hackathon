"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Folder, Paperclip, X } from "lucide-react";
import { filesFromTransfer, readLocalFile } from "@/lib/local-files";
import { sanctionById, sanctions } from "@/lib/sanctions";
import type { DocketFile, Sanction } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ChatAttachment =
  | { id: string; kind: "sanction"; label: string; sanctionId: string }
  | { id: string; kind: "file"; label: string; file: DocketFile };

const LIMIT = 40;

export function ChatAttach({
  attachments,
  onChange,
  disabled,
}: {
  attachments: ChatAttachment[];
  onChange: (next: ChatAttachment[]) => void;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const panelId = useId();

  useEffect(() => {
    folderRef.current?.setAttribute("webkitdirectory", "");
    folderRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function take(list: File[]) {
    const next = await attachLocalFiles(attachments, list);
    onChange(next.attachments);
    setNotice(next.notice);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl px-2 text-sm text-muted hover:bg-elevated hover:text-paper disabled:opacity-40"
      >
        <Paperclip className="h-4 w-4" />
        Attach
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Attach to the conversation"
          className="absolute bottom-full left-0 z-30 mb-2 w-72 overflow-hidden rounded-xl border border-line bg-white shadow-lg"
        >
          <p className="px-3 pt-3 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">Sanctions</p>
          <ul className="max-h-48 overflow-auto px-1 py-1">
            {sanctions.map((item) => {
              const selected = attachments.some((attachment) => attachment.kind === "sanction" && attachment.sanctionId === item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange(toggleSanction(attachments, item))}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-elevated",
                      selected && "bg-elevated",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-paper">{item.title}</span>
                      <span className="block truncate text-[11px] text-faint">{item.authority}</span>
                    </span>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-gold" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line p-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-paper hover:bg-elevated"
            >
              <Paperclip className="h-4 w-4 text-muted" />
              Files
            </button>
            <button
              type="button"
              onClick={() => folderRef.current?.click()}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-paper hover:bg-elevated"
            >
              <Folder className="h-4 w-4 text-muted" />
              Folder
            </button>
          </div>
          {notice ? <p className="px-3 pb-3 text-[11px] leading-relaxed text-faint">{notice}</p> : null}
        </div>
      ) : null}
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
  );
}

export function AttachmentChips({
  attachments,
  onRemove,
  disabled,
}: {
  attachments: ChatAttachment[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  if (!attachments.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {attachments.map((item) => (
        <li key={item.id} className="flex max-w-full items-center gap-1 rounded-full bg-elevated py-1 pr-1 pl-3 text-xs text-paper">
          <span className="text-faint">{item.kind === "sanction" ? "Sanction" : "File"}</span>
          <span className="truncate">{item.label}</span>
          <button
            type="button"
            aria-label={`Remove ${item.label}`}
            disabled={disabled}
            onClick={() => onRemove(item.id)}
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-hover hover:text-paper disabled:opacity-40"
          >
            <X className="h-3 w-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function documentsFromAttachments(attachments: ChatAttachment[]): DocketFile[] {
  const seen = new Set<string>();
  const documents: DocketFile[] = [];
  for (const item of attachments) {
    const files =
      item.kind === "sanction"
        ? (sanctionById(item.sanctionId)?.files ?? []).map((file) => ({
            ...file,
            name: `${item.label} — ${file.name}`,
          }))
        : [item.file];
    for (const file of files) {
      const key = file.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      documents.push(file);
      if (documents.length >= LIMIT) return documents;
    }
  }
  return documents;
}

export async function addDroppedFiles(attachments: ChatAttachment[], transfer: DataTransfer) {
  const files = await filesFromTransfer(transfer);
  return attachLocalFiles(attachments, files);
}

export async function attachLocalFiles(current: ChatAttachment[], list: File[]) {
  const read = await Promise.all(list.slice(0, LIMIT).map(readLocalFile));
  const clean = read.filter((file): file is DocketFile => Boolean(file));
  const next = [...current];
  const names = new Set(next.filter((item) => item.kind === "file").map((item) => item.label.toLowerCase()));
  let skipped = list.length > LIMIT;
  for (const file of clean) {
    const key = file.name.toLowerCase();
    if (names.has(key)) continue;
    if (next.length >= LIMIT) {
      skipped = true;
      break;
    }
    names.add(key);
    next.push({ id: `file:${key}`, kind: "file", label: file.name, file });
  }
  return {
    attachments: next,
    notice: skipped ? "Only the first 40 files were kept. Text files are read. Other files are indexed." : "",
  };
}

function toggleSanction(current: ChatAttachment[], sanction: Sanction): ChatAttachment[] {
  const id = `sanction:${sanction.id}`;
  if (current.some((item) => item.id === id)) return current.filter((item) => item.id !== id);
  return [...current, { id, kind: "sanction" as const, label: sanction.title, sanctionId: sanction.id }];
}
