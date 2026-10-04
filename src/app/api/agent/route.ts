import { ndjsonResponse } from "@/lib/chat-events";
import { rankLibrary, stitchReading } from "@/lib/corpus";
import { runHarness } from "@/lib/harness";
import {
  resolveModel,
  runDesk,
  sanitizeBrief,
  type ResearchNote,
  type ToolContext,
} from "@/lib/rakazo";
import type { Hit } from "@/lib/types";

export const maxDuration = 90;

function mistralWarning(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("429") || /rate limit/i.test(message)) {
    return "Mistral rate limit. The desk draft was kept.";
  }
  if (message.includes("403")) return "This Mistral model is not on the key's plan. The desk draft was kept.";
  if (message.includes("401")) return "Mistral rejected the API key. The desk draft was kept.";
  return "Mistral was unavailable. The desk draft was kept.";
}

type HistoryTurn = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const brief = sanitizeBrief(record.matter);
  if (!brief) return Response.json({ error: "Open a matter first." }, { status: 400 });

  const history = historyOf(record.messages);
  const latest = history.at(-1);
  if (!latest || latest.role !== "user") {
    return Response.json({ error: "Ask Rakazo something first." }, { status: 400 });
  }

  const memory = memoryOf(record.memory);
  const ctx: ToolContext = { brief, lookup };
  const key = process.env.MISTRAL_API_KEY;

  return ndjsonResponse(async (send) => {
    send({ type: "status", label: "Reading the folder" });
    const desk = await runDesk(latest.content, ctx, send);
    if (!key) {
      send({ type: "token", text: desk.text });
      send({ type: "done", source: "desk", model: "desk", text: desk.text, steps: desk.steps, memories: desk.memories });
      return;
    }
    try {
      const model = resolveModel(typeof record.model === "string" ? record.model : "default");
      const harness = await runHarness({
        key,
        model,
        task: "agent",
        query: latest.content,
        jurisdiction: ctx.brief.jurisdiction,
        history: history.slice(0, -1),
        memory,
        folder: ctx.brief.documents,
        graph: [
          `${ctx.brief.title}. ${ctx.brief.caption}`,
          ctx.brief.summary,
          ctx.brief.theories.length ? `Theories: ${ctx.brief.theories.join("; ")}` : "",
          ctx.brief.gaps.length ? `Gaps already on the sheet: ${ctx.brief.gaps.join("; ")}` : "",
          desk.steps.map((step) => `${step.label}: ${step.detail}`).join("\n"),
        ]
          .filter(Boolean)
          .join("\n"),
        emit: send,
      });
      const steps = [
        ...desk.steps,
        {
          tool: "scholar",
          label: "Scholar",
          detail: `${harness.citations.length} sources · confidence ${Math.round(harness.confidence * 100)}%`,
        },
        ...harness.debate.map((round) => ({
          tool: "critic",
          label: `Critic · round ${round.round}`,
          detail: round.critic,
        })),
      ];
      send({
        type: "done",
        source: "mistral",
        model,
        text: harness.answer,
        steps,
        memories: desk.memories,
        reflection: harness.reflection,
        confidence: harness.confidence,
        debate: harness.debate.map((round) => ({ round: round.round, critic: round.critic, verdict: round.verdict })),
        citations: harness.citations,
      });
    } catch (error) {
      send({ type: "token", text: desk.text });
      send({
        type: "done",
        source: "desk",
        model: "desk",
        text: desk.text,
        warning: mistralWarning(error),
        steps: desk.steps,
        memories: desk.memories,
      });
    }
  });
}

function historyOf(value: unknown): HistoryTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: HistoryTurn[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const text = (item as { text?: unknown }).text;
    if ((role !== "user" && role !== "assistant") || typeof text !== "string") continue;
    const content = text.trim().slice(0, 4000);
    if (!content) continue;
    turns.push({ role, content });
  }
  return turns.slice(-12);
}

function memoryOf(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim().slice(0, 280))
    .filter(Boolean)
    .slice(0, 12);
}

async function lookup(query: string): Promise<ResearchNote> {
  const libraryHits = rankLibrary(query);
  let webHits: Hit[] = [];
  const key = process.env.TAVILY_API_KEY;
  if (key) {
    try {
      webHits = await searchWeb(key, query);
    } catch {
      webHits = [];
    }
  }
  const hits = dedupe([...webHits, ...libraryHits]).slice(0, 6);
  const live = webHits.length > 0;
  return {
    query,
    synthesis: stitchReading(query, hits, live),
    sources: hits.map((hit) => ({
      title: hit.title,
      publisher: hit.publisher,
      origin: hit.origin,
    })),
  };
}

async function searchWeb(key: string, query: string): Promise<Hit[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: "advanced",
      max_results: 5,
      include_answer: false,
    }),
  });
  if (!response.ok) throw new Error("Search failed");
  const data = (await response.json()) as {
    results?: { title?: string; url?: string; content?: string }[];
  };
  return (data.results ?? []).slice(0, 5).map((result) => ({
    title: result.title || "Untitled page",
    publisher: domainOf(result.url),
    url: result.url,
    excerpt: (result.content || "").slice(0, 520),
    origin: "web" as const,
  }));
}

function domainOf(url?: string) {
  if (!url) return "Live web";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Live web";
  }
}

function dedupe(hits: Hit[]) {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    const key = hit.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
