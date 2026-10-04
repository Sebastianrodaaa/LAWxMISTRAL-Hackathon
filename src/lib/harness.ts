import type { ChatCitation, ChatEvent } from "./chat-events";
import { corpus, rankLibrary } from "./corpus";
import { mistralError } from "./mistral";
import { orderCitations } from "./order-citations";
import type { Hit } from "./types";

/**
 * Scholar–critic loop adapted from
 * https://github.com/mohnishsunil/legal-research-ai-agent
 * (retrieval → scholar → critic → scholar, up to 3 rounds).
 * Retrieval uses the Atrium source library, the open folder, and
 * Tavily when a key is set. Mistral runs the scholar and the critic.
 */

const MAX_ROUNDS = 3;
const CACHE_TTL_MS = 60 * 60 * 1000;

export type HarnessCitation = {
  title: string;
  excerpt: string;
  publisher: string;
  origin: "library" | "web" | "folder";
  url?: string;
};

export type DebateRound = {
  round: number;
  scholar: string;
  critic: string;
  verdict: "needs_revision" | "acceptable";
};

export type HarnessResult = {
  query: string;
  answer: string;
  reflection: string;
  confidence: number;
  citations: ChatCitation[];
  debate: DebateRound[];
  cached: boolean;
  model: string;
};

type HarnessTask = "research" | "agent" | "pitch";

type HarnessInput = {
  key: string;
  model: string;
  task: HarnessTask;
  query: string;
  jurisdiction?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  memory?: string[];
  folder?: { name: string; text: string }[];
  sources?: HarnessCitation[];
  graph?: string;
  note?: string;
  emit?: (event: Extract<ChatEvent, { type: "status" | "round" | "token" | "step" | "citations" }>) => void;
};

type CacheEntry = { at: number; value: HarnessResult };

const cache = new Map<string, CacheEntry>();

const SCHOLAR_SYSTEM = `You are an expert legal scholar with deep knowledge of case law, statutes, and legal precedents.

Your role is to provide rigorous, well-grounded legal analysis based strictly on the provided source documents.

Rules:
- Only make claims that are directly supported by the provided citations
- Cite the supporting source at the end of each factual sentence as [1] or [1][2], using only numbers from the source list
- Always reference specific documents when making legal arguments
- Identify key legal principles, precedents, and statutory interpretations
- Note any conflicting authorities or jurisdictional differences
- Be precise about legal terminology
- If the sources are insufficient to answer the question, say so explicitly
- This is a demonstration desk. Do not present the note as a legal opinion or as a recommendation to fund

Never hallucinate cases, statutes, dollar amounts, or legal principles not present in the sources.`;

const REFLECTION_PROMPT = `You are a rigorous legal scholar reviewing your own analysis.

Review the analysis below and generate a reflection trace addressing:
1. Are all claims supported by the cited sources?
2. Have I represented the law accurately and without oversimplification?
3. Are there gaps in the sources that limit the analysis?
4. Have I considered conflicting authorities?
5. What are the limitations of this analysis?

Be honest and precise. This reflection will be shown to the user.

Respond in this exact JSON format:
{
  "reflection": "your detailed reflection here",
  "confidence_score": 0.5,
  "gaps": ["gap 1"],
  "limitations": ["limitation 1"]
}

Return only valid JSON, no explanation, no markdown.`;

const CRITIC_SYSTEM = `You are a sharp legal critic and devil's advocate. Your role is to challenge legal analysis rigorously.

Your job is to:
- Identify unsupported claims or logical leaps
- Point out missing authorities or contrary precedents
- Challenge oversimplifications of complex legal issues
- Identify jurisdictional issues or exceptions not addressed
- Question whether the sources actually support the conclusions drawn
- Flag any potential misinterpretations of legal text
- Flag any dollar amount, class size, date, or party that is not in the sources

Be precise, adversarial, and constructive. Your challenges should make the analysis stronger.

Respond in this exact JSON format:
{
  "challenges": ["challenge 1", "challenge 2"],
  "missing_considerations": ["consideration 1"],
  "verdict": "needs_revision",
  "critique_summary": "overall critique in 2-3 sentences"
}

verdict must be "needs_revision" or "acceptable".
Return only valid JSON, no explanation, no markdown.`;

const REVISION_PROMPT = `You are an expert legal scholar revising your analysis based on criticism.

Address each challenge raised by the critic and strengthen your analysis.
Maintain strict grounding in the provided source documents.
If a challenge cannot be addressed due to source limitations, acknowledge this explicitly.
Do not add cases, statutes, or figures that are not in the sources.
Keep each source marker, such as [1], on the sentence it supports.`;

const PITCH_SCHOLAR = `You are the writing desk at Atrium. Rewrite the slide narrative so it is specific to this folder.
Use only facts in the folder or in the draft. Do not invent parties, dollar amounts, class sizes, dates, docket numbers, or citations.
If a fact is missing, say it is not in the folder.
Keep exactly 10 slides and the existing kicker labels.
Return JSON only, shaped as {"slides":[{"kicker":"","title":"","body":"","bullets":[""],"stat":{"value":"","label":""},"footnote":""}]}.`;

const PITCH_REVISION = `You are revising a 10-slide litigation-finance deck after a critic's review.
Keep exactly 10 slides. Do not invent figures. If a challenge cannot be met from the folder, say the fact is not in the folder.
Return JSON only, shaped as {"slides":[{"kicker":"","title":"","body":"","bullets":[""],"stat":{"value":"","label":""},"footnote":""}]}.`;

export async function runHarness(input: HarnessInput): Promise<HarnessResult> {
  const query = input.query.trim().slice(0, 2000);
  const cacheKey = [
    "cite-v2",
    input.task,
    input.model,
    query,
    input.jurisdiction || "",
    (input.folder ?? []).map((file) => file.name).join("|"),
    input.note || "",
  ].join("\n");
  const hit = readCache(cacheKey);
  if (hit) return { ...hit, cached: true };

  input.emit?.({ type: "status", label: "Reading the sources" });
  const retrieved = await retrieve(query, input);
  for (const citation of retrieved.citations.slice(0, 6)) {
    input.emit?.({
      type: "step",
      step: {
        tool: citation.origin === "web" ? "web" : citation.origin === "folder" ? "read_document" : "research",
        label: citation.title,
        detail: citation.publisher,
        href: citation.url,
      },
    });
  }
  input.emit?.({ type: "status", label: "Drafting the note" });
  const citationsText = retrieved.citations
    .map((item, index) => `[${index + 1}] ${item.title} (${item.origin}, ${item.publisher}):\n${item.excerpt}`)
    .join("\n\n");
  const prior = (input.history ?? [])
    .slice(-6)
    .map((turn) => `${turn.role}: ${turn.content}`)
    .join("\n");

  let analysis = stripFences(
    await complete(
      input.key,
      input.model,
      input.task === "pitch" ? PITCH_SCHOLAR : SCHOLAR_SYSTEM,
      [
        `Legal research query: ${query}`,
        input.jurisdiction ? `Jurisdiction: ${input.jurisdiction}` : "",
        prior ? `Conversation so far:\n${prior}` : "",
        input.note ? `NGO note, emphasis only. Do not treat it as a fact:\n${input.note}` : "",
        `Knowledge graph context:\n${retrieved.graph || "No related concepts in the library."}`,
        `Source documents:\n${citationsText || "No sources were retrieved."}`,
        input.task === "pitch"
          ? "Provide the 10-slide JSON from these sources only."
          : "Provide a concise legal analysis based strictly on these sources. Two or three short paragraphs. End each factual sentence with its source marker, for example [1].",
      ]
        .filter(Boolean)
        .join("\n\n"),
    ),
  );
  if (!analysis) throw new Error("Mistral returned an empty analysis.");

  const reflection = await reflect(input.key, input.model, analysis);
  const debate: DebateRound[] = [];
  let round = 1;
  let completeDebate = false;

  while (!completeDebate && round <= MAX_ROUNDS) {
    const critique = await criticize(input.key, input.model, query, analysis);
    debate.push({
      round,
      scholar: clip(analysis, 900),
      critic: clip(critique.summary, 500),
      verdict: critique.verdict,
    });
    input.emit?.({
      type: "round",
      round,
      verdict: critique.verdict,
      critic: clip(critique.summary, 500),
    });
    if (critique.verdict !== "needs_revision" || round >= MAX_ROUNDS) {
      completeDebate = true;
      break;
    }
    input.emit?.({ type: "status", label: `Revising · round ${round}` });
    const challenges = critique.challenges.map((item) => `- ${item}`).join("\n");
    analysis = stripFences(
      await complete(
        input.key,
        input.model,
        input.task === "pitch" ? PITCH_REVISION : REVISION_PROMPT,
        [
          `Original analysis:\n${analysis}`,
          `Critic's challenges:\n${challenges || critique.summary}`,
          `Citations available:\n${retrieved.citations
            .map((item, index) => `[${index + 1}] ${item.title}: ${item.excerpt.slice(0, 200)}`)
            .join("\n")}`,
          input.task === "pitch"
            ? "Revise the 10-slide JSON. Address the challenges without adding facts."
            : "Revise the analysis. Address the challenges without adding facts.",
        ].join("\n\n"),
      ),
    );
    if (!analysis) break;
    round += 1;
  }

  let citations = publicCitations(retrieved.citations);
  let answer = analysis;
  if (input.task !== "pitch") {
    input.emit?.({ type: "citations", citations });
    input.emit?.({ type: "status", label: "Writing the note" });
    let streamed = "";
    try {
      await streamPresent(input.key, input.model, query, analysis, (text) => {
        streamed += text;
        input.emit?.({ type: "token", text });
      });
    } catch {
      // Keep any sentences already sent. A later fallback is used only when nothing arrived.
    }
    answer = withMarkers(streamed.trim(), analysis);
    if (!streamed.trim() && answer) input.emit?.({ type: "token", text: answer });
    const published = orderCitations(answer, citations);
    if (published.citations.length) {
      answer = published.text;
      citations = published.citations;
    }
  }

  const result: HarnessResult = {
    query,
    answer: input.task === "pitch" ? analysis : answer.slice(0, 4000),
    reflection: reflection.reflection,
    confidence: reflection.confidence,
    citations,
    debate,
    cached: false,
    model: input.model,
  };
  writeCache(cacheKey, result);
  return result;
}

async function retrieve(query: string, input: HarnessInput) {
  if (input.sources?.length) {
    return {
      citations: dedupe(input.sources).slice(0, 10),
      graph: graphContext(query, input.graph || "", input.memory ?? []),
    };
  }
  const folder: HarnessCitation[] = (input.folder ?? []).slice(0, 8).map((file) => ({
    title: file.name,
    excerpt: file.text.slice(0, 1200),
    publisher: "Open folder",
    origin: "folder" as const,
  }));
  const library = rankLibrary(query, 6).map(hitToCitation);
  let web: HarnessCitation[] = [];
  const tavily = process.env.TAVILY_API_KEY;
  if (tavily && input.task !== "pitch") {
    try {
      web = await searchWeb(tavily, query);
    } catch {
      web = [];
    }
  }
  const citations = dedupe([...folder, ...web, ...library]).slice(0, 10);
  return { citations, graph: graphContext(query, input.graph || "", input.memory ?? []) };
}

function graphContext(query: string, extra: string, memory: string[]) {
  const concepts = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 5)
    .slice(0, 5);
  const related = corpus
    .filter((hit) => {
      const hay = `${hit.title} ${hit.excerpt}`.toLowerCase();
      return concepts.some((concept) => hay.includes(concept));
    })
    .slice(0, 4)
    .map((hit) => `${hit.title} (${hit.publisher})`);
  const lines = [
    extra,
    memory.length ? `Teammate memory:\n${memory.slice(0, 6).join("\n")}` : "",
    related.length ? `Related library concepts:\n${related.join("\n")}` : "",
  ].filter(Boolean);
  return lines.join("\n\n").slice(0, 2000);
}

function hitToCitation(hit: Hit): HarnessCitation {
  return {
    title: hit.title,
    excerpt: hit.excerpt.slice(0, 700),
    publisher: hit.publisher,
    origin: hit.origin,
    url: hit.url,
  };
}

async function searchWeb(key: string, query: string): Promise<HarnessCitation[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: "advanced",
      max_results: 4,
      include_answer: false,
    }),
  });
  if (!response.ok) throw new Error("Search failed");
  const data = (await response.json()) as {
    results?: { title?: string; url?: string; content?: string }[];
  };
  return (data.results ?? []).slice(0, 4).map((result) => ({
    title: result.title || "Untitled page",
    excerpt: (result.content || "").slice(0, 700),
    publisher: domainOf(result.url),
    origin: "web" as const,
    url: result.url,
  }));
}

async function reflect(key: string, model: string, analysis: string) {
  try {
    const content = await complete(key, model, REFLECTION_PROMPT, `Analysis to review:\n\n${analysis.slice(0, 4000)}`, true);
    const parsed = parseJson(content) as { reflection?: unknown; confidence_score?: unknown };
    const score = typeof parsed.confidence_score === "number" ? parsed.confidence_score : 0.5;
    return {
      reflection: typeof parsed.reflection === "string" ? clip(parsed.reflection, 700) : "",
      confidence: Math.min(1, Math.max(0, score)),
    };
  } catch {
    return { reflection: "", confidence: 0.5 };
  }
}

async function criticize(
  key: string,
  model: string,
  query: string,
  analysis: string,
): Promise<{ verdict: "needs_revision" | "acceptable"; challenges: string[]; summary: string }> {
  try {
    const content = await complete(
      key,
      model,
      CRITIC_SYSTEM,
      `Legal query: ${query}\n\nScholar's analysis:\n${analysis.slice(0, 4000)}\n\nChallenge this analysis rigorously.`,
      true,
    );
    const parsed = parseJson(content) as {
      challenges?: unknown;
      verdict?: unknown;
      critique_summary?: unknown;
    };
    const challenges = Array.isArray(parsed.challenges)
      ? parsed.challenges.filter((item) => typeof item === "string").slice(0, 4).map((item) => item.slice(0, 240))
      : [];
    const verdict = parsed.verdict === "needs_revision" ? "needs_revision" : "acceptable";
    const summary =
      typeof parsed.critique_summary === "string" && parsed.critique_summary.trim()
        ? parsed.critique_summary.trim()
        : challenges.join(" ");
    return { verdict, challenges, summary: summary || "No further challenge." };
  } catch {
    return { verdict: "acceptable" as const, challenges: [] as string[], summary: "The critic could not finish a challenge." };
  }
}

const PRESENT_PROMPT = `You write the note a colleague reads on this desk.
Rewrite the analysis below as two or three short paragraphs of plain sentences.
Separate paragraphs with a blank line.
Do not use markdown, asterisks, headings, or bullet lists.
Do not mention a critic, a debate, a revision, or your own process.
Do not add facts that are not in the analysis.
Keep every figure the analysis states.
Keep every source marker, such as [1] or [2], in the sentence it supports.
Do not drop a marker, spell it out as "Source 1", or invent a number that is not in the analysis.`;

async function streamPresent(
  key: string,
  model: string,
  query: string,
  analysis: string,
  onToken: (text: string) => void,
) {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(28000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 500,
      stream: true,
      messages: [
        { role: "system", content: PRESENT_PROMPT },
        { role: "user", content: `Question: ${query}\n\nAnalysis:\n${analysis.slice(0, 4000)}` },
      ],
    }),
  });
  if (!response.ok) throw new Error(await mistralError(response));
  if (!response.body) throw new Error("Empty Mistral response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
      const text = parsed.choices?.[0]?.delta?.content;
      if (text) onToken(text);
    }
  }
}

function withMarkers(presented: string, analysis: string) {
  if (/\[\d{1,2}\]/.test(presented)) return presented;
  if (/\[\d{1,2}\]/.test(analysis)) return presentLocally(analysis);
  return presented;
}

function publicCitations(items: HarnessCitation[]): ChatCitation[] {
  return items.slice(0, 10).map((item, index) => ({
    n: index + 1,
    title: item.title.slice(0, 160),
    publisher: item.publisher.slice(0, 80),
    origin: item.origin,
    excerpt: item.excerpt.slice(0, 500),
    url: item.url && /^https?:\/\//.test(item.url) ? item.url : undefined,
  }));
}

function presentLocally(analysis: string) {
  const cleaned = analysis
    .replace(/^\s*(\*\*)?revised analysis:?(\*\*)?\s*/i, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part && !/^however, the critic\b/i.test(part) && !/^the critic\b/i.test(part));
  return paragraphs.slice(0, 3).join("\n\n").slice(0, 1800);
}

async function complete(key: string, model: string, system: string, user: string, json = false) {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(28000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) throw new Error(await mistralError(response));
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty Mistral response");
  return content;
}

function parseJson(content: string) {
  const stripped = stripFences(content);
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Mistral did not return JSON");
  return JSON.parse(stripped.slice(start, end + 1)) as unknown;
}

function stripFences(content: string) {
  return content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

function readCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache(key: string, value: HarnessResult) {
  if (cache.size > 40) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value });
}

function dedupe(items: HarnessCitation[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function domainOf(url?: string) {
  if (!url) return "Live web";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Live web";
  }
}

function clip(value: string, max: number) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
