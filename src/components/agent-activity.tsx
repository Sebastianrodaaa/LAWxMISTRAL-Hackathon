"use client";

import { useState } from "react";
import { HarnessNote } from "@/components/harness-note";
import { AGENT_MODELS, type RakazoMessage } from "@/lib/rakazo-types";

export function AgentActivity({
  message,
  running = false,
}: {
  message?: (RakazoMessage & { status?: string }) | null;
  running?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const steps = message?.steps ?? [];
  const label = message ? messageLabel(message) : "";

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[13px] font-medium">Agent activity</h2>
      {running && message?.status ? (
        <p className="text-[11px] font-medium tracking-[0.14em] text-gold uppercase">{message.status}</p>
      ) : null}
      {steps.length ? (
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={`${step.tool}-${index}`}>
              <p className="text-sm font-medium text-paper">{step.label}</p>
              {step.detail ? <p className="mt-1 text-sm leading-relaxed text-muted">{step.detail}</p> : null}
            </li>
          ))}
        </ol>
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
    </div>
  );
}

function messageLabel(message: RakazoMessage) {
  if (message.source === "mistral") {
    return AGENT_MODELS.find((item) => item.id === message.model)?.label ?? "Mistral";
  }
  return message.source === "desk" ? "Desk" : "";
}
