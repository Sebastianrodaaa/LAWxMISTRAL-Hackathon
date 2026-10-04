import { buildMatter } from "@/lib/build";
import type { DocketFile, Slide } from "@/lib/types";

export async function POST(request: Request) {
  let body: { files?: DocketFile[] };
  try {
    body = (await request.json()) as { files?: DocketFile[] };
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const files = sanitizeFiles(body.files);
  if (!files.length) {
    return Response.json({ error: "No files to read." }, { status: 400 });
  }

  const matter = buildMatter(files, { origin: "desk", shared: false });
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return Response.json({ source: "desk", matter });

  try {
    const slides = await rewriteSlides(key, files, matter.slides);
    if (!slides) {
      return Response.json({
        source: "desk",
        matter,
        warning: "Mistral did not return a usable deck.",
      });
    }
    return Response.json({ source: "mistral", matter: { ...matter, slides } });
  } catch {
    return Response.json({
      source: "desk",
      matter,
      warning: "Mistral was unavailable. The desk draft was kept.",
    });
  }
}

function sanitizeFiles(files: DocketFile[] | undefined): DocketFile[] {
  if (!Array.isArray(files)) return [];
  return files
    .filter((file) => file && typeof file.name === "string" && typeof file.text === "string")
    .slice(0, 12)
    .map((file) => ({
      name: file.name.slice(0, 180),
      kind: String(file.kind || "txt").slice(0, 16),
      text: file.text.slice(0, 6000),
    }));
}

async function rewriteSlides(key: string, files: DocketFile[], draft: Slide[]) {
  const folder = files
    .map((file) => `## ${file.name}\n${file.text.slice(0, 2500)}`)
    .join("\n\n");
  const content = await mistral(
    key,
    `You are the writing desk at Atrium, a litigation-finance platform for NGOs and capital.
Rewrite the slide narrative so it is specific to this folder.
Use only facts in the folder or in the draft slides. Do not invent parties, dollar amounts, class sizes, dates, docket numbers, or citations.
If a fact is missing, say it is not in the folder.
Keep exactly 10 slides and the existing kicker labels.
Return JSON only, shaped as {"slides":[{"kicker":"","title":"","body":"","bullets":[""],"stat":{"value":"","label":""},"footnote":""}]}.`,
    `Folder:\n${folder}\n\nDraft slides:\n${JSON.stringify(draft)}`,
  );
  const parsed = JSON.parse(content) as { slides?: unknown };
  if (!Array.isArray(parsed.slides) || parsed.slides.length !== 10) return null;
  const slides = parsed.slides.map(asSlide);
  if (slides.some((slide) => !slide)) return null;
  return slides as Slide[];
}

function asSlide(value: unknown): Slide | null {
  if (!value || typeof value !== "object") return null;
  const slide = value as Slide;
  if (typeof slide.kicker !== "string" || typeof slide.title !== "string" || typeof slide.body !== "string") {
    return null;
  }
  const next: Slide = {
    kicker: slide.kicker.slice(0, 80),
    title: slide.title.slice(0, 180),
    body: slide.body.slice(0, 900),
  };
  if (Array.isArray(slide.bullets)) {
    next.bullets = slide.bullets.filter((item) => typeof item === "string").slice(0, 6);
  }
  if (slide.stat && typeof slide.stat.value === "string" && typeof slide.stat.label === "string") {
    next.stat = { value: slide.stat.value.slice(0, 40), label: slide.stat.label.slice(0, 80) };
  }
  if (typeof slide.footnote === "string") next.footnote = slide.footnote.slice(0, 240);
  return next;
}

async function mistral(key: string, system: string, user: string) {
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
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) throw new Error("Mistral request failed");
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty Mistral response");
  return content;
}
