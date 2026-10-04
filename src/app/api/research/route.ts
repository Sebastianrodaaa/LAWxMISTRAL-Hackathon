import { corpus, rankLibrary, stitchReading } from "@/lib/corpus";
import type { Hit } from "@/lib/types";

export async function POST(request: Request) {
  let body: { query?: string };
  try {
    body = (await request.json()) as { query?: string };
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const query = String(body.query || "").trim().slice(0, 400);
  if (!query) return Response.json({ error: "Ask a question first." }, { status: 400 });

  const libraryHits = rankLibrary(query);
  let webHits: Hit[] = [];
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    try {
      webHits = await searchWeb(tavilyKey, query);
    } catch {
      webHits = [];
    }
  }

  const hits = dedupe([...webHits, ...libraryHits]).slice(0, 8);
  const live = webHits.length > 0;
  let synthesis = stitchReading(query, hits.length ? hits : corpus.slice(0, 3), live);
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey && hits.length) {
    try {
      const rewritten = await synthesize(mistralKey, query, hits, live);
      if (rewritten) synthesis = rewritten;
    } catch {
      // Keep the stitched reading.
    }
  }

  return Response.json({
    query,
    synthesis,
    hits: hits.length ? hits : corpus.slice(0, 3),
    live,
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

async function synthesize(key: string, query: string, hits: Hit[], live: boolean) {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(28000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.MISTRAL_MODEL || "mistral-small-latest",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write research notes for a litigation-finance desk. Use only the sources provided. Do not add cases, numbers, or citations that are not in those sources. Two short paragraphs. Say this is not a legal opinion and not a recommendation to fund. Return JSON {\"synthesis\":\"...\"}.",
        },
        {
          role: "user",
          content: JSON.stringify({
            query,
            liveWebIncluded: live,
            sources: hits.map((hit) => ({
              title: hit.title,
              publisher: hit.publisher,
              origin: hit.origin,
              excerpt: hit.excerpt,
            })),
          }),
        },
      ],
    }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  const parsed = JSON.parse(content) as { synthesis?: unknown };
  return typeof parsed.synthesis === "string" ? parsed.synthesis.slice(0, 1800) : null;
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
