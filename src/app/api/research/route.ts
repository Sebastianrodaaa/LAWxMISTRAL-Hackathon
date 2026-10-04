import { ndjsonResponse } from "@/lib/chat-events";
import { corpus, rankLibrary, stitchReading } from "@/lib/corpus";
import { runHarness } from "@/lib/harness";
import { deskWarning } from "@/lib/mistral";
import { resolveModel } from "@/lib/rakazo";
import type { Hit } from "@/lib/types";

export const maxDuration = 90;

export async function POST(request: Request) {
  let body: { query?: string };
  try {
    body = (await request.json()) as { query?: string };
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const query = String(body.query || "").trim().slice(0, 400);
  if (!query) return Response.json({ error: "Ask a question first." }, { status: 400 });

  const mistralKey = process.env.MISTRAL_API_KEY;

  return ndjsonResponse(async (send) => {
    send({ type: "status", label: "Reading the library" });
    const libraryHits = rankLibrary(query);
    let webHits: Hit[] = [];
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey) {
      send({ type: "status", label: "Searching the live web" });
      try {
        webHits = await searchWeb(tavilyKey, query);
      } catch {
        webHits = [];
      }
    }
    const hits = dedupe([...webHits, ...libraryHits]).slice(0, 8);
    const shown = hits.length ? hits : corpus.slice(0, 3);
    const live = webHits.length > 0;
    const stitched = stitchReading(query, shown, live);
    if (!mistralKey) {
      for (const hit of shown) {
        send({
          type: "step",
          step: {
            tool: hit.origin === "web" ? "web" : "research",
            label: hit.title,
            detail: hit.publisher,
            href: hit.url,
          },
        });
      }
      send({ type: "token", text: stitched });
      send({ type: "done", source: "desk", text: stitched });
      return;
    }
    try {
      const harness = await runHarness({
        key: mistralKey,
        model: resolveModel("default"),
        task: "research",
        query,
        sources: shown.map((hit) => ({
          title: hit.title,
          excerpt: hit.excerpt,
          publisher: hit.publisher,
          origin: hit.origin,
          url: hit.url,
        })),
        emit: send,
      });
      send({
        type: "done",
        source: "mistral",
        model: harness.model,
        text: harness.answer,
        reflection: harness.reflection,
        confidence: harness.confidence,
        debate: harness.debate.map((round) => ({ round: round.round, critic: round.critic, verdict: round.verdict })),
        citations: harness.citations,
      });
    } catch (error) {
      send({ type: "token", text: stitched });
      send({ type: "done", source: "desk", text: stitched, warning: deskWarning(error) });
    }
  });
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
