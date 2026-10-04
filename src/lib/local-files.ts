import type { DocketFile } from "./types";

const TEXT = new Set(["txt", "md", "markdown", "csv", "json", "html", "htm"]);

export async function readLocalFile(file: File): Promise<DocketFile | null> {
  const label = file.webkitRelativePath || file.name;
  if (!label || label.split("/").pop()?.startsWith(".")) return null;
  const kind = file.name.split(".").pop()?.toLowerCase() || "file";
  if (TEXT.has(kind) && file.size < 1_500_000) {
    const text = (await file.text()).slice(0, 20000);
    return { name: label, kind, text };
  }
  return {
    name: label,
    kind,
    text: `Exhibit index entry only. ${label} is ${file.size.toLocaleString("en-US")} bytes and was not read as text.`,
  };
}

export async function filesFromTransfer(transfer: DataTransfer): Promise<File[]> {
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
