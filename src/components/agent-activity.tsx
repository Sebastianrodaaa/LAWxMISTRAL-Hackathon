"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAgentRun, useRakazoDesk } from "@/lib/rakazo-desk";
import type { AgentStep } from "@/lib/rakazo-types";

const STAGES = [280, 420, 640, 480];

type Row = {
  primary: string;
  secondary?: string;
};

function useSequence(steps: number[]) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (stage >= steps.length - 1) return;
    const timer = setTimeout(() => setStage((current) => current + 1), steps[stage]);
    return () => clearTimeout(timer);
  }, [stage, steps]);
  return stage;
}

export function AgentActivity({ steps }: { steps?: AgentStep[] }) {
  const desk = useRakazoDesk();
  const run = useAgentRun();
  const thread = desk.threads.find((item) => item.id === desk.activeId) ?? desk.threads[0];
  const last = [...(thread?.messages ?? [])].reverse().find((message) => message.role === "assistant" && message.steps?.length);
  const recorded = (steps?.length ? steps : last?.steps ?? []).map((step) => ({
    primary: step.label,
    secondary: step.detail,
  }));
  const rows = run.running
    ? [{ primary: run.prompt || "Reading the desk." }]
    : recorded;
  const key = run.running ? `run:${run.prompt}` : rows.map((row) => row.primary).join("|") || "idle";

  return <ThinkingTrace key={key} rows={rows} running={run.running} />;
}

function ThinkingTrace({ rows, running }: { rows: Row[]; running: boolean }) {
  const stage = useSequence(running || rows.length === 0 ? [0] : STAGES);
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const autoExpanded = running || rows.length === 0 || (stage >= 1 && stage < 3);
  const expanded = manualExpanded ?? autoExpanded;
  const working = running || (rows.length > 0 && stage < 2);
  const visible = running
    ? rows.length
    : stage < 1
      ? 0
      : stage === 1
        ? Math.min(2, rows.length)
        : rows.length;
  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);
  useLayoutEffect(() => {
    if (traceRef.current) setLineHeight(traceRef.current.offsetHeight);
  }, [visible, expanded]);

  const title = rows.length === 0 ? "Waiting" : working ? "Thinking" : `Ran ${rows.length} ${rows.length === 1 ? "step" : "steps"}`;

  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((current) => !(current ?? autoExpanded))}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-lg px-1.5 py-1 transition-colors duration-100 hover:bg-hover"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={working ? "var(--muted)" : "var(--faint)"} aria-hidden>
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
        {working && rows.length > 0 ? (
          <span
            className="bg-clip-text text-[13px] font-medium whitespace-nowrap text-transparent"
            style={{
              backgroundImage: "linear-gradient(90deg, var(--faint) 35%, var(--paper) 50%, var(--faint) 65%)",
              backgroundSize: "200% 100%",
              animation: "shimmer-text 1.4s linear infinite",
            }}
          >
            {title}
          </span>
        ) : (
          <span className="text-[13px] font-medium whitespace-nowrap text-muted" style={{ animation: "fade-in 350ms ease-out both" }}>
            {title}
          </span>
        )}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--faint)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-300"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1 ml-[5px] pl-4">
            <span
              aria-hidden
              className="absolute left-[3px] w-px bg-line"
              style={{
                top: -8,
                height: lineHeight ? lineHeight - 2 : 0,
                transition: "height 500ms cubic-bezier(0.23,1,0.32,1)",
              }}
            />
            <div ref={traceRef} className="flex flex-col gap-1 py-1">
              {rows.length === 0 ? (
                <p className="px-1.5 text-[12.5px] text-faint">Ask the agent and the run shows up here.</p>
              ) : (
                rows.slice(0, visible).map((row, index) => {
                  const settled = index < visible - 1 || !working;
                  return (
                    <div
                      key={`${row.primary}-${index}`}
                      className="flex min-h-7 w-full items-center gap-2 rounded-md px-1.5 py-0.5 text-left"
                      style={{ animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${index * 120}ms both` }}
                    >
                      {settled ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <span className="size-3 shrink-0 animate-spin rounded-full border-[1.5px] border-faint border-t-muted" />
                      )}
                      <span className="min-w-0 truncate text-[12.5px] font-medium text-paper">{row.primary}</span>
                      {row.secondary ? <span className="min-w-0 truncate text-[11.5px] text-faint">{row.secondary}</span> : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
