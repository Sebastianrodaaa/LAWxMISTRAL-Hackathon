"use client";

import { useLayoutEffect, useRef, useState } from "react";

export type ActivityRow = {
  id: string;
  kind: "step" | "search" | "tool";
  primary: string;
  secondary?: string;
  href?: string;
  mono?: boolean;
};

const TONES = ["bg-gold", "bg-paper", "bg-muted"];

export function InvestorActivity({
  running,
  label,
  query,
  rows,
}: {
  running: boolean;
  label: string;
  query?: string;
  rows: ActivityRow[];
}) {
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);
  const expandable = running || rows.length > 0;
  const expanded = expandable && (manualExpanded ?? running);

  useLayoutEffect(() => {
    if (traceRef.current) setLineHeight(traceRef.current.offsetHeight);
  }, [rows, expanded, query]);

  return (
    <div className="flex w-full flex-col p-4">
      <button
        type="button"
        aria-expanded={expandable ? expanded : undefined}
        disabled={!expandable}
        onClick={() => setManualExpanded((current) => !(current ?? running))}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-lg px-1.5 py-1 transition-colors duration-100 hover:bg-hover disabled:hover:bg-transparent"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={running ? "var(--gold)" : "var(--faint)"} aria-hidden>
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
        {running ? (
          <span
            className="bg-clip-text text-[13px] font-medium whitespace-nowrap text-transparent"
            style={{
              backgroundImage: "linear-gradient(90deg, var(--faint) 35%, var(--paper) 50%, var(--faint) 65%)",
              backgroundSize: "200% 100%",
              animation: "shimmer-text 1.4s linear infinite",
            }}
          >
            {label}
          </span>
        ) : (
          <span className="text-[13px] font-medium whitespace-nowrap text-muted" style={{ animation: "fade-in 350ms ease-out both" }}>
            {label}
          </span>
        )}
        {expandable ? (
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
        ) : null}
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-500"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="overflow-hidden" inert={expanded ? undefined : true}>
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
              {query ? (
                <div className="flex h-6 items-center gap-2 px-1.5" style={{ animation: "fade-up 300ms cubic-bezier(0.23,1,0.32,1) both" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" className="shrink-0" aria-hidden>
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                  <span className="truncate text-[12.5px] text-muted">{query}</span>
                </div>
              ) : null}
              {rows.map((row, index) => {
                const last = index === rows.length - 1;
                const content = (
                  <>
                    {row.kind === "search" ? <Dot tone={TONES[index % TONES.length]} /> : null}
                    {row.kind === "step" ? (
                      !running || !last ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <span className="size-3 shrink-0 animate-spin rounded-full border-[1.5px] border-faint border-t-paper" />
                      )
                    ) : null}
                    <span className={`min-w-0 text-[12.5px] ${row.kind === "step" ? "font-medium text-paper" : "truncate font-medium text-paper"} ${row.href ? "underline decoration-line underline-offset-4" : ""}`}>
                      {row.primary}
                    </span>
                    {row.secondary ? (
                      <span className={`shrink-0 truncate text-[11.5px] text-faint ${row.mono ? "font-mono" : ""}`}>{row.secondary}</span>
                    ) : null}
                  </>
                );
                const rowClass = "flex min-h-7 w-full items-center gap-2 rounded-md px-1.5 py-0.5 text-left";
                const animation = { animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${index * 120}ms both` };

                if (row.href) {
                  return (
                    <a key={row.id} href={row.href} target="_blank" rel="noreferrer" className={`${rowClass} transition-colors duration-150 hover:bg-hover`} style={animation}>
                      {content}
                    </a>
                  );
                }

                if (row.kind === "tool") {
                  const selected = selectedTool === row.id;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedTool(selected ? null : row.id)}
                      className={`${rowClass} cursor-pointer transition-colors duration-150 ${selected ? "bg-elevated" : "hover:bg-hover"}`}
                      style={animation}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <div key={row.id} className={rowClass} style={animation}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot({ tone }: { tone: string }) {
  return (
    <span className={`flex size-3.5 shrink-0 items-center justify-center rounded-full text-white ${tone}`}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    </span>
  );
}
