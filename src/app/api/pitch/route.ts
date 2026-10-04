import { buildMatter } from "@/lib/build";
import { runHarness } from "@/lib/harness";
import { deskWarning } from "@/lib/mistral";
import { resolveModel } from "@/lib/rakazo";
import type { DocketFile, Slide } from "@/lib/types";

export const maxDuration = 90;

export async function POST(request: Request) {
  let body: { files?: DocketFile[]; note?: string };
  try {
    body = (await request.json()) as { files?: DocketFile[]; note?: string };
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const files = sanitizeFiles(body.files);
  if (!files.length) {
    return Response.json({ error: "No files to read." }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 400) : "";

  const matter = buildMatter(files, { origin: "desk", shared: false });
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return Response.json({ source: "desk", matter });

  try {
    const harness = await runHarness({
      key,
      model: resolveModel("default"),
      task: "pitch",
      query: `Rewrite the narrative for ${matter.title}. Keep these ten kickers: ${matter.slides.map((slide) => slide.kicker).join(", ")}.`,
      jurisdiction: matter.jurisdiction,
      folder: files.map((file) => ({ name: file.name, text: file.text })),
      note,
      graph: `Draft slides, figures included:\n${JSON.stringify(matter.slides).slice(0, 6000)}`,
    });
    const slides = slidesFrom(harness.answer);
    if (!slides) {
      return Response.json({
        source: "desk",
        matter,
        warning: "Mistral did not return a usable deck.",
        reflection: harness.reflection,
        confidence: harness.confidence,
        debate: harness.debate,
      });
    }
    return Response.json({
      source: "mistral",
      matter: { ...matter, slides },
      reflection: harness.reflection,
      confidence: harness.confidence,
      debate: harness.debate,
    });
  } catch (error) {
    return Response.json({
      source: "desk",
      matter,
      warning: deskWarning(error),
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

function slidesFrom(content: string): Slide[] | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(content.slice(start, end + 1)) as { slides?: unknown };
    if (!Array.isArray(parsed.slides) || parsed.slides.length !== 10) return null;
    const slides = parsed.slides.map(asSlide);
    if (slides.some((slide) => !slide)) return null;
    return slides as Slide[];
  } catch {
    return null;
  }
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
