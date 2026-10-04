import { money } from "./format";
import { funds } from "./funds";
import { rankFunds } from "./match";
import type { AgentStep, MatterBrief } from "./rakazo-types";

/**
 * Tool runtime for the Agent tab, shaped after Rakazo
 * (https://github.com/elie222/rakazo, Apache-2.0): a teammate that
 * reads a folder, uses tools, and keeps a computer trace.
 * On this desk the computer is the matter folder, the capital book,
 * and the source library. Nothing is emailed.
 */

export type ResearchNote = {
  query: string;
  synthesis: string;
  sources: { title: string; publisher: string; origin: "library" | "web" }[];
};

export type ToolContext = {
  brief: MatterBrief;
  lookup: (query: string) => Promise<ResearchNote>;
};

type PlannedCall = { name: string; args: Record<string, unknown> };

type ToolOutcome = {
  name: string;
  step: AgentStep;
  memory?: string;
  payload: unknown;
};

export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "read_matter",
      description:
        "Read the open matter: caption, summary, theories, gaps, worksheet ask, and the file list. File bodies are not included.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "read_document",
      description: "Read one file from the open folder by its file name.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "File name as listed by read_matter." },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rank_capital",
      description: "Score the capital book against the open matter and return the closest mandates.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_outreach",
      description:
        "Draft an outreach note to one fund. The note is not sent. Pass a fund id from rank_capital, or omit it to use the closest mandate.",
      parameters: {
        type: "object",
        properties: {
          fundId: { type: "string", description: "Fund id such as northline. Optional." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "research",
      description:
        "Search the Atrium source library and, when a web key is configured, the live web. Returns labeled sources. Does not invent citations.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The research question." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remember",
      description: "Save one short note into this teammate's memory on the desk.",
      parameters: {
        type: "object",
        properties: {
          note: { type: "string", description: "One sentence to remember." },
        },
        required: ["note"],
        additionalProperties: false,
      },
    },
  },
];

export function agentSystemPrompt(brief: MatterBrief, memory: string[]) {
  const files = brief.documents.map((file) => file.name).join(", ") || "none";
  const lines = [
    "You are Rakazo, the persistent teammate on the Atrium desk.",
    "Atrium is a funding read for NGOs bringing class actions and for the hedge funds and litigation desks that finance them.",
    "Use tools before you state a figure, a party, a mandate fit, or a source that is not already in the brief below.",
    "Use only the brief and tool results. If a fact is missing, say it is not in the folder.",
    "Do not invent parties, dollar amounts, class sizes, dates, docket numbers, or citations.",
    "An outreach note is a draft. Never say it was sent.",
    "You are not a law firm, not a broker-dealer, and not making a recommendation to fund.",
    "Write short paragraphs a principal can read. No preamble.",
    "",
    `Open matter: ${brief.title}`,
    `NGO: ${brief.ngo}`,
    `Caption: ${brief.caption}`,
    `Focus: ${brief.focus}`,
    `Forum: ${brief.jurisdiction}`,
    `Stage: ${brief.stage}`,
    `Counsel: ${brief.counsel}`,
    `Worksheet ask: ${money(brief.fundingAsk)}`,
    `Class: ${brief.classSize} ${brief.classUnit}`,
    `Theories: ${brief.theories.join("; ") || "none listed"}`,
    `Gaps: ${brief.gaps.join(" ") || "none listed"}`,
    `Files: ${files}`,
    brief.summary ? `Summary already on the desk: ${brief.summary.slice(0, 700)}` : "",
    memory.length ? `Saved memory:\n${memory.map((note) => `- ${note}`).join("\n")}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export function sanitizeBrief(value: unknown): MatterBrief | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as MatterBrief;
  const title = clip(raw.title, 180);
  if (!title) return null;
  const documents = Array.isArray(raw.documents) ? raw.documents : [];
  return {
    id: clip(raw.id, 80) || "matter",
    title,
    caption: clip(raw.caption, 400),
    ngo: clip(raw.ngo, 160) || "NGO",
    focus: clip(raw.focus, 160),
    jurisdiction: clip(raw.jurisdiction, 160),
    stage: clip(raw.stage, 80),
    counsel: clip(raw.counsel, 160),
    tags: list(raw.tags, 12, 40),
    theories: list(raw.theories, 8, 180),
    summary: clip(raw.summary, 1200),
    gaps: list(raw.gaps, 8, 240),
    fundingAsk: finite(raw.fundingAsk),
    classSize: finite(raw.classSize),
    classUnit: clip(raw.classUnit, 40) || "people",
    documents: documents.slice(0, 8).flatMap((file) => {
      if (!file || typeof file !== "object") return [];
      const name = clip((file as { name?: unknown }).name, 180);
      if (!name) return [];
      return [
        {
          name,
          kind: clip((file as { kind?: unknown }).kind, 16) || "txt",
          text: clip((file as { text?: unknown }).text, 4000),
        },
      ];
    }),
  };
}

export function planDesk(message: string, brief: MatterBrief): PlannedCall[] {
  const text = message.trim();
  const lower = text.toLowerCase();
  if (isGreeting(text)) return [];

  const calls: PlannedCall[] = [{ name: "read_matter", args: {} }];
  if (/\bremember\b/i.test(text)) {
    const note = text.replace(/^[\s\S]*?\bremember\b[:\s]*/i, "").trim();
    if (note) calls.push({ name: "remember", args: { note: note.slice(0, 280) } });
  }
  if (/\b(research|precedent|predominance|settlement|library|source|case law|certif)/i.test(lower)) {
    const query = `${text} ${brief.focus} ${brief.tags.join(" ")}`.trim().slice(0, 400);
    calls.push({ name: "research", args: { query } });
  }
  if (/\b(fund|investor|capital|mandate|rank|match|outreach|draft|note|email)\b/i.test(lower)) {
    calls.push({ name: "rank_capital", args: {} });
  }
  if (/\b(outreach|draft|note|email|write)\b/i.test(lower)) {
    const named = funds.find((fund) => lower.includes(fund.name.toLowerCase()) || lower.includes(fund.id));
    calls.push({ name: "draft_outreach", args: named ? { fundId: named.id } : {} });
  }
  for (const file of brief.documents) {
    const stem = file.name.replace(/\.[^.]+$/, "").toLowerCase();
    if (stem.length > 3 && lower.includes(stem)) {
      calls.push({ name: "read_document", args: { name: file.name } });
    }
  }
  return calls;
}

export async function runDesk(message: string, ctx: ToolContext) {
  const outcomes: ToolOutcome[] = [];
  for (const call of planDesk(message, ctx.brief)) {
    outcomes.push(await executeTool(call.name, call.args, ctx));
  }
  return {
    text: composeDesk(message, ctx.brief, outcomes),
    steps: outcomes.map((outcome) => outcome.step),
    memories: outcomes.flatMap((outcome) => (outcome.memory ? [outcome.memory] : [])),
  };
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  const brief = ctx.brief;
  if (name === "read_matter") {
    const payload = {
      title: brief.title,
      ngo: brief.ngo,
      caption: brief.caption,
      focus: brief.focus,
      jurisdiction: brief.jurisdiction,
      stage: brief.stage,
      counsel: brief.counsel,
      summary: brief.summary,
      theories: brief.theories,
      gaps: brief.gaps,
      tags: brief.tags,
      fundingAsk: brief.fundingAsk,
      classSize: brief.classSize,
      classUnit: brief.classUnit,
      documents: brief.documents.map((file) => ({
        name: file.name,
        kind: file.kind,
        characters: file.text.length,
      })),
    };
    return {
      name,
      payload,
      step: {
        tool: name,
        label: "Read the folder",
        detail: `${brief.documents.length} files · ask ${money(brief.fundingAsk)}`,
      },
    };
  }

  if (name === "read_document") {
    const requested = clip(args.name, 180).toLowerCase();
    const file = brief.documents.find((item) => item.name.toLowerCase() === requested)
      ?? brief.documents.find((item) => item.name.toLowerCase().includes(requested));
    if (!file) {
      return {
        name,
        payload: { error: "That file is not in the folder.", files: brief.documents.map((item) => item.name) },
        step: { tool: name, label: "Opened a file", detail: "Not in the folder" },
      };
    }
    return {
      name,
      payload: { name: file.name, text: file.text.slice(0, 3500) },
      step: { tool: name, label: "Opened a file", detail: file.name },
    };
  }

  if (name === "rank_capital") {
    const matches = rankFunds(asMatter(brief), funds).slice(0, 4).map((match) => ({
      id: match.fund.id,
      name: match.fund.name,
      kind: match.fund.kind,
      city: match.fund.city,
      score: match.score,
      reasons: match.reasons,
    }));
    return {
      name,
      payload: { matches },
      step: {
        tool: name,
        label: "Scored the book",
        detail: matches.map((match) => `${match.name} ${match.score}`).join(" · ") || "No mandates",
      },
    };
  }

  if (name === "draft_outreach") {
    const ranked = rankFunds(asMatter(brief), funds);
    const requested = clip(args.fundId, 80).toLowerCase();
    const match = ranked.find((item) => item.fund.id === requested || item.fund.name.toLowerCase() === requested) ?? ranked[0];
    if (!match) {
      return {
        name,
        payload: { error: "No mandate to draft against." },
        step: { tool: name, label: "Drafted a note", detail: "No mandate" },
      };
    }
    const note = [
      `${match.fund.name}, ${match.fund.city}`,
      "",
      `${brief.ngo} is circulating ${brief.title}.`,
      brief.caption,
      `The worksheet ask is ${money(brief.fundingAsk)}.`,
      match.reasons[0],
      match.reasons[1],
      "",
      "Draft only. This note has not been sent.",
    ].filter((line) => line !== undefined).join("\n");
    return {
      name,
      payload: { fundId: match.fund.id, fundName: match.fund.name, note },
      step: { tool: name, label: "Drafted a note", detail: match.fund.name },
    };
  }

  if (name === "research") {
    const query = clip(args.query, 400);
    if (!query) {
      return {
        name,
        payload: { error: "No question to research." },
        step: { tool: name, label: "Searched the library", detail: "Empty question" },
      };
    }
    try {
      const note = await ctx.lookup(query);
      return {
        name,
        payload: note,
        step: {
          tool: name,
          label: "Searched the library",
          detail: note.sources.map((source) => source.title).slice(0, 3).join(" · ") || "No source",
        },
      };
    } catch {
      return {
        name,
        payload: { error: "The library search failed." },
        step: { tool: name, label: "Searched the library", detail: "Search failed" },
      };
    }
  }

  if (name === "remember") {
    const note = clip(args.note, 280);
    if (!note) {
      return {
        name,
        payload: { error: "Nothing to remember." },
        step: { tool: name, label: "Saved a memory", detail: "Empty note" },
      };
    }
    return {
      name,
      memory: note,
      payload: { note },
      step: { tool: name, label: "Saved a memory", detail: note },
    };
  }

  return {
    name,
    payload: { error: "That tool is not on this desk." },
    step: { tool: name || "unknown", label: "Skipped a tool", detail: "Not on this desk" },
  };
}

export function composeDesk(message: string, brief: MatterBrief, outcomes: ToolOutcome[]) {
  if (!outcomes.length || isGreeting(message)) {
    return [
      `Rakazo is on ${brief.title} for ${brief.ngo}.`,
      "I can read the folder, score the capital book, draft a note, and search the source library.",
      "Memory and routines stay in this browser. Nothing is emailed.",
    ].join(" ");
  }

  const parts: string[] = [];
  const rank = outcomes.find((outcome) => outcome.name === "rank_capital");
  const draft = outcomes.find((outcome) => outcome.name === "draft_outreach");
  const research = outcomes.find((outcome) => outcome.name === "research");
  const opened = outcomes.filter((outcome) => outcome.name === "read_document");
  const remembered = outcomes.filter((outcome) => outcome.memory);

  if (!rank && !draft && !research && !opened.length) {
    parts.push(folderBrief(brief));
  }
  if (opened.length) {
    for (const outcome of opened) {
      const payload = outcome.payload as { name?: string; text?: string; error?: string };
      if (payload.text && payload.name) {
        parts.push(`${payload.name}\n\n${payload.text}`);
      } else if (payload.error) {
        parts.push(payload.error);
      }
    }
  }
  if (rank) {
    const matches = (rank.payload as { matches?: { name: string; kind: string; city: string; score: number; reasons: string[] }[] }).matches ?? [];
    const lines = matches.map((match) =>
      [`${match.name} · ${match.score}`, `${match.kind} · ${match.city}`, ...match.reasons].join("\n"),
    );
    parts.push([`Closest mandates for ${brief.title}.`, ...lines].join("\n\n"));
  }
  if (draft) {
    const note = (draft.payload as { note?: string }).note;
    if (note) parts.push(note);
  }
  if (research) {
    const payload = research.payload as ResearchNote & { error?: string };
    if (payload.synthesis) {
      const sources = (payload.sources ?? [])
        .map((source) => `${source.title} — ${source.publisher} — ${source.origin}`)
        .join("\n");
      parts.push(sources ? `${payload.synthesis}\n\nSources\n${sources}` : payload.synthesis);
    } else if (payload.error) {
      parts.push(payload.error);
    }
  }
  if (remembered.length) {
    parts.push(`Saved to memory: ${remembered.map((outcome) => outcome.memory).join(" ")}`);
  }
  return parts.filter(Boolean).join("\n\n");
}

export function resolveModel(requested: string) {
  const fallback = sanitizeModel(process.env.MISTRAL_MODEL || "mistral-small-latest");
  if (!requested || requested === "default") return fallback;
  if (
    requested === "mistral-medium-3-5" ||
    requested === "mistral-small-latest" ||
    requested === "mistral-large-latest"
  ) {
    return requested;
  }
  return fallback;
}

function folderBrief(brief: MatterBrief) {
  const gaps = brief.gaps.slice(0, 3);
  return [
    `${brief.ngo} is circulating ${brief.title}.`,
    brief.summary,
    `The worksheet ask is ${money(brief.fundingAsk)} for a class of ${brief.classSize.toLocaleString("en-US")} ${brief.classUnit}.`,
    brief.theories.length ? `Theories on the sheet: ${brief.theories.join("; ")}.` : "",
    gaps.length ? `Not in the folder: ${gaps.join(" ")}` : "The sheet does not list a gap.",
    `Files: ${brief.documents.map((file) => file.name).join(", ") || "none"}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function asMatter(brief: MatterBrief) {
  return {
    tags: brief.tags,
    assumptions: { fundingAsk: brief.fundingAsk },
  } as Parameters<typeof rankFunds>[0];
}

function isGreeting(message: string) {
  const text = message.trim();
  if (text.length > 80) return false;
  return /^(hi|hello|hey|thanks|thank you)[.!?\s]*$/i.test(text) || /^(what can you do|how can you help)[.!?\s]*$/i.test(text);
}

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function list(value: unknown, maxItems: number, maxLen: number) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function finite(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sanitizeModel(value: string) {
  return /^[A-Za-z0-9._:-]{1,80}$/.test(value) ? value : "mistral-small-latest";
}
