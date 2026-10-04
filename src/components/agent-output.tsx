"use client";

import { useState } from "react";
import { Brain, Check, ChevronDown, ExternalLink, FileText, Globe, Search } from "lucide-react";
import type { ChatCitation } from "@/lib/chat-events";
import type { AgentStep } from "@/lib/rakazo-types";
import { cn } from "@/lib/utils";

const PIXEL_DELAYS = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3);
  const column = index % 3;
  return (column + Math.abs(row - 1)) * 90;
});

export function AgentOutput({
  running = false,
  status,
  steps = [],
  citations = [],
  elapsedMs,
  children,
}: {
  running?: boolean;
  status?: string;
  steps?: AgentStep[];
  citations?: ChatCitation[];
  elapsedMs?: number;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState<boolean | null>(null);
  const expanded = open ?? running;
  const sources = citations.filter((item) => item.url);
  const showTrace = running || steps.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {showTrace ? (
        <div>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setOpen(!expanded)}
            className="group flex w-fit cursor-pointer items-center gap-1.5 rounded-sm text-left text-[13.5px] text-faint hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            {running ? <PixelDots /> : null}
            {running ? (
              <span className="agent-shimmer bg-clip-text font-medium text-transparent motion-reduce:bg-none motion-reduce:text-muted">
                {status || "Working…"}
              </span>
            ) : (
              <span>{workedLabel(elapsedMs)}</span>
            )}
            <ChevronDown className={cn("size-3 opacity-40 transition-transform duration-200 group-hover:opacity-80", expanded && "rotate-180")} />
          </button>
          <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none", expanded ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0")}>
            <div className="min-h-0 overflow-hidden">
              <div className="mt-1 ml-2 flex flex-col border-l border-line py-0.5 pl-2">
                {steps.map((step, index) => (
                  <TraceRow
                    key={`${step.tool}-${index}`}
                    step={step}
                    active={running && index === steps.length - 1}
                    sources={step.tool === "scholar" ? sources : []}
                  />
                ))}
                {sources.length && !steps.some((step) => step.tool === "scholar") ? (
                  <TraceRow step={{ tool: "research", label: "Sources", detail: `${sources.length} sources` }} sources={sources} />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {children}
    </div>
  );
}

function PixelDots() {
  return (
    <span aria-hidden="true" className="grid shrink-0 grid-cols-[repeat(3,3px)] items-center gap-[1.5px]">
      {PIXEL_DELAYS.map((delay, index) => (
        <span
          key={index}
          className="agent-pixel size-[3px] rounded-full bg-paper/80 motion-reduce:animate-none"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function TraceRow({ step, active = false, sources = [] }: { step: AgentStep; active?: boolean; sources?: ChatCitation[] }) {
  const long = step.detail.length > 72;
  const [open, setOpen] = useState(false);
  const expandable = long || sources.length > 0;
  const Icon = iconFor(step);

  return (
    <div className="my-0.5 flex flex-col">
      <button
        type="button"
        disabled={!expandable}
        aria-expanded={expandable ? open : undefined}
        onClick={() => expandable && setOpen((value) => !value)}
        className={cn(
          "group/row flex h-7 w-full items-center gap-2 rounded-md px-1.5 text-left text-[12px]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold",
          expandable ? "cursor-pointer hover:bg-elevated" : "cursor-default",
        )}
      >
        <span className="relative flex size-4 shrink-0 items-center justify-center text-faint">
          <span className={cn("flex items-center justify-center", expandable && "group-hover/row:opacity-0", open && "opacity-0")}>
            {active ? (
              <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-faint/40 border-t-paper motion-reduce:animate-none" />
            ) : (
              <Icon className={cn("size-3.5", iconTone(step))} />
            )}
          </span>
          {expandable ? (
            <ChevronDown className={cn("absolute size-3.5 opacity-0 transition-transform duration-200 group-hover/row:opacity-100", open ? "rotate-0 opacity-100" : "-rotate-90")} />
          ) : null}
        </span>
        <span className="shrink-0 font-medium text-paper">{step.label}</span>
        {step.detail && !long ? (
          <span className="inline-flex h-5 min-w-0 max-w-[65%] items-center truncate rounded-md border border-line bg-elevated/80 px-1.5 font-mono text-[11px] text-faint">
            {step.detail}
          </span>
        ) : null}
      </button>
      {expandable ? (
        <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none", open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0")}>
          <div className="min-h-0 overflow-hidden">
            <div className="mt-1 mb-1.5 ml-2.5 flex flex-col gap-1.5 border-l border-line py-0.5 pl-2.5">
              {long ? <p className="text-[12px] leading-relaxed text-muted">{step.detail}</p> : null}
              {sources.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {sources.map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-panel px-2.5 py-0.5 text-[11px] text-faint hover:text-paper"
                    >
                      <Globe className="size-2.5 shrink-0" />
                      <span className="truncate">{source.title}</span>
                      <ExternalLink className="size-2.5 shrink-0 opacity-60" />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function iconFor(step: AgentStep) {
  const key = `${step.tool} ${step.label}`.toLowerCase();
  if (key.includes("critic") || key.includes("scholar")) return Brain;
  if (key.includes("search") || key.includes("web") || key.includes("research") || key.includes("source")) return Search;
  if (key.includes("read") || key.includes("folder") || key.includes("file")) return FileText;
  return Check;
}

function iconTone(step: AgentStep) {
  const key = `${step.tool} ${step.label}`.toLowerCase();
  if (key.includes("search") || key.includes("web") || key.includes("research") || key.includes("source") || key.includes("scholar")) return "text-gold";
  return "text-faint";
}

function workedLabel(elapsedMs?: number) {
  if (typeof elapsedMs !== "number") return "Worked";
  const seconds = Math.max(1, Math.round(elapsedMs / 1000));
  return `Worked for ${seconds} ${seconds === 1 ? "second" : "seconds"}`;
}
