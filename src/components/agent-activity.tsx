"use client";

import { useState } from "react";
import { HarnessNote } from "@/components/harness-note";
import {
  AiChainOfThought,
  AiChainOfThoughtContent,
  AiChainOfThoughtHeader,
  AiChainOfThoughtSearchResults,
  AiChainOfThoughtStep,
  type StepStatus,
} from "@/components/ui/chain-of-thought";
import { AGENT_MODELS, type AgentStep, type RakazoMessage } from "@/lib/rakazo-types";

export function AgentActivity({
  message,
  running = false,
}: {
  message?: (RakazoMessage & { status?: string }) | null;
  running?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const rows = activityRows(message, running);
  const done = running ? Math.max(0, rows.length - 1) : rows.length;
  const sources = (message?.citations ?? [])
    .filter((item) => item.url)
    .map((item) => ({ title: item.title, url: item.url!, snippet: item.excerpt || item.publisher }));
  const scholarIndex = rows.findIndex((step) => step.tool === "scholar");
  const label = message ? messageLabel(message) : "";

  return (
    <AiChainOfThought defaultOpen>
      <AiChainOfThoughtHeader
        title="Agent activity"
        stepCount={rows.length || undefined}
        completedCount={rows.length ? done : undefined}
      />
      <AiChainOfThoughtContent>
        {rows.length ? (
          rows.map((step, index) => (
            <AiChainOfThoughtStep
              key={`${step.tool}-${index}`}
              status={stepStatus(index, rows.length, running)}
              title={step.label}
              description={step.detail || undefined}
            >
              {sources.length && index === (scholarIndex === -1 ? rows.length - 1 : scholarIndex) ? (
                <AiChainOfThoughtSearchResults results={sources} />
              ) : null}
            </AiChainOfThoughtStep>
          ))
        ) : (
          <p className="text-sm leading-relaxed text-muted">Ask the agent and the run shows up here.</p>
        )}
        {message?.text ? (
          <div className="flex flex-wrap items-center gap-2">
            {label ? <p className="text-[11px] text-faint">{label}</p> : null}
            <button
              type="button"
              className="cursor-pointer text-[11px] font-medium text-gold"
              onClick={() => {
                void navigator.clipboard.writeText(message.text).then(
                  () => setCopied(true),
                  () => setCopied(false),
                );
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}
        {message?.warning ? <p className="text-[11px] text-warn">{message.warning}</p> : null}
        <HarnessNote reflection={message?.reflection} confidence={message?.confidence} debate={message?.debate} open />
      </AiChainOfThoughtContent>
    </AiChainOfThought>
  );
}

function activityRows(message: (RakazoMessage & { status?: string }) | null | undefined, running: boolean): AgentStep[] {
  const recorded = message?.steps ?? [];
  const status = running && message?.status ? message.status : "";
  if (!status || recorded.at(-1)?.label === status) return recorded;
  return [...recorded, { tool: "status", label: status, detail: "" }];
}

function stepStatus(index: number, total: number, running: boolean): StepStatus {
  if (!running || index < total - 1) return "complete";
  return "active";
}

function messageLabel(message: RakazoMessage) {
  if (message.source === "mistral") {
    return AGENT_MODELS.find((item) => item.id === message.model)?.label ?? "Mistral";
  }
  return message.source === "desk" ? "Desk" : "";
}
