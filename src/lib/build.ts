import { money, pct } from "./format";
import { runModel } from "./model";
import type {
  Assumptions,
  DocketFile,
  Matter,
  RuleFactor,
  Slide,
  TraceStep,
} from "./types";

const UPDATED = "4 Oct 2026";

const FALLBACK_RULES: RuleFactor[] = [
  {
    factor: "Numerosity",
    rule: "23(a)(1)",
    score: 50,
    note: "Not scored in the folder.",
  },
  {
    factor: "Commonality",
    rule: "23(a)(2)",
    score: 50,
    note: "Not scored in the folder.",
  },
  {
    factor: "Typicality",
    rule: "23(a)(3)",
    score: 50,
    note: "Not scored in the folder.",
  },
  {
    factor: "Adequacy",
    rule: "23(a)(4)",
    score: 50,
    note: "Not scored in the folder.",
  },
  {
    factor: "Predominance",
    rule: "23(b)(3)",
    score: 50,
    note: "Not scored in the folder.",
  },
  {
    factor: "Superiority",
    rule: "23(b)(3)",
    score: 50,
    note: "Not scored in the folder.",
  },
];

export function buildMatter(
  files: DocketFile[],
  options?: { id?: string; origin?: "library" | "desk"; shared?: boolean },
): Matter {
  const text = files.map((file) => file.text).join("\n");
  const gaps: string[] = [];
  const caption = field(text, "CAPTION") ?? titleFromFiles(files);
  const title = field(text, "TITLE") ?? caption;
  const tags = tagsFrom(text);
  const theories = theoriesFrom(text, tags);
  const summary =
    field(text, "SUMMARY") ??
    "The folder did not include a summary. The deck indexes what was actually read and leaves every missing figure unmarked rather than filling it in.";
  if (!field(text, "SUMMARY")) gaps.push("summary");

  const assumptions = readAssumptions(text, gaps);
  const rule23 = readRules(text);
  const slides = composeSlides({
    files,
    caption,
    title,
    ngo: field(text, "NGO") ?? "NGO not named in the folder",
    jurisdiction: field(text, "JURISDICTION") ?? "Forum not stated",
    stage: field(text, "STAGE") ?? "Stage not stated",
    counsel: field(text, "COUNSEL") ?? "Counsel not named",
    tags,
    theories,
    summary,
    assumptions,
    gaps,
  });

  if (!field(text, "CAPTION")) gaps.push("caption");

  return {
    id: options?.id ?? makeId(title),
    title,
    caption,
    ngo: field(text, "NGO") ?? "Unnamed organization",
    focus: field(text, "FOCUS") ?? "Focus not stated",
    jurisdiction: field(text, "JURISDICTION") ?? "Forum not stated",
    stage: field(text, "STAGE") ?? "Stage not stated",
    counsel: field(text, "COUNSEL") ?? "Counsel not named",
    tags,
    theories,
    summary,
    documents: files.map((file) => ({
      ...file,
      text: file.text.slice(0, 8000),
    })),
    slides,
    rule23,
    assumptions,
    gaps,
    origin: options?.origin ?? "desk",
    shared: options?.shared ?? false,
    updated: field(text, "UPDATED") ?? UPDATED,
  };
}

export function agentTrace(matter: Matter, words: number): TraceStep[] {
  const gross = runModel(matter.assumptions).gross;
  return [
    {
      id: "inventory",
      label: "Inventory",
      detail: `${matter.documents.length} files · ${words.toLocaleString()} words read`,
    },
    {
      id: "parties",
      label: "Parties",
      detail: matter.gaps.includes("caption")
        ? "No caption sheet. Using file names."
        : matter.caption,
    },
    {
      id: "class",
      label: "Class",
      detail: matter.gaps.includes("class")
        ? "Class size was not in the folder."
        : `${matter.assumptions.classSize.toLocaleString()} ${matter.assumptions.classUnit} · ${matter.jurisdiction}`,
    },
    {
      id: "theory",
      label: "Theories",
      detail: matter.theories.length
        ? matter.theories.join(" · ")
        : "No claim theory stated in the folder.",
    },
    {
      id: "damages",
      label: "Damages",
      detail: matter.gaps.length
        ? `Worksheet base ${money(gross)}. ${matter.gaps.length} inputs were missing and are marked.`
        : `Worksheet base ${money(gross)} before the certification haircut.`,
    },
    {
      id: "deck",
      label: "Deck",
      detail: `${matter.slides.length} slides, in the Atrium order.`,
    },
  ];
}

export function wordCount(files: DocketFile[]) {
  return files.reduce(
    (total, file) => total + file.text.split(/\s+/).filter(Boolean).length,
    0,
  );
}

function composeSlides(input: {
  files: DocketFile[];
  caption: string;
  title: string;
  ngo: string;
  jurisdiction: string;
  stage: string;
  counsel: string;
  tags: string[];
  theories: string[];
  summary: string;
  assumptions: Assumptions;
  gaps: string[];
}): Slide[] {
  const model = runModel(input.assumptions);
  const quote = pullQuote(input.files);
  const askLabel = input.gaps.includes("ask") ? "Ask not in the folder" : "Funding ask";

  return [
    {
      kicker: "01  /  Cover",
      title: input.caption,
      body: input.summary,
      stat: { value: money(input.assumptions.fundingAsk), label: askLabel },
      footnote: `${input.ngo} · ${input.jurisdiction} · Prepared for a funding read, not filed as a pleading.`,
    },
    {
      kicker: "02  /  Harm",
      title: input.title,
      body: quote?.quote ?? input.summary,
      footnote: quote ? `Lifted from ${quote.source}.` : "No narrative exhibit in the folder.",
    },
    {
      kicker: "03  /  Class",
      title: input.gaps.includes("class")
        ? "The class is not defined in the folder"
        : `${input.assumptions.classSize.toLocaleString()} ${input.assumptions.classUnit}`,
      body: `${input.stage}. Forum: ${input.jurisdiction}. Counsel named in the folder: ${input.counsel}.`,
      bullets: [
        input.ngo,
        input.assumptions.classUnit
          ? `Unit of the class: ${input.assumptions.classUnit}.`
          : "Class unit not stated.",
        "Absent members are not in this room. The deck is a funding document, not notice.",
      ],
    },
    {
      kicker: "04  /  Claims",
      title: input.theories.length ? input.theories[0] : "Theories not stated",
      body: input.theories.length
        ? "The folder states these theories. Atrium did not add any."
        : "No theory line and no recognizable claim language. Do not treat silence as a claim.",
      bullets: input.theories.length ? input.theories : ["Not in the folder."],
    },
    {
      kicker: "05  /  Folder",
      title: `${input.files.length} documents on the desk`,
      body: "The agent indexed every file it was given. Binary files are listed, not read.",
      bullets: input.files.slice(0, 6).map((file) => file.name),
      footnote:
        input.files.length > 6
          ? `${input.files.length - 6} more files sit in the source list.`
          : "Full text is behind each source on the capital desk.",
    },
    {
      kicker: "06  /  Damages",
      title: "Worksheet, not a verdict",
      body: `Gross recovery on the stated inputs is ${money(model.gross)} across ${Math.round(model.participants).toLocaleString()} participating ${input.assumptions.classUnit}. That number is participation times harm, then cut by defendant capacity if the capacity figure is lower.`,
      stat: { value: money(model.gross), label: "Gross, before fees and certification" },
      footnote: input.gaps.length
        ? `Missing from the folder: ${input.gaps.join(", ")}. Placeholders are labeled on the capital worksheet.`
        : "Every input on this slide was stated in the folder.",
    },
    {
      kicker: "07  /  Proceeds",
      title: `What ${money(input.assumptions.fundingAsk)} is for`,
      body: `${input.stage}. The budget below is inferred from the kind of case, not from an invoice in the folder.`,
      bullets: proceeds(input.tags, input.stage),
    },
    {
      kicker: "08  /  Bargain",
      title: `${pct(input.assumptions.fundShare)} of net recovery`,
      body: `After a ${pct(input.assumptions.counselFee)} counsel-fee assumption, the position takes ${pct(input.assumptions.fundShare)} of what remains. On the base worksheet, certification-weighted proceeds to capital are ${money(model.expected)}, or ${model.moic.toFixed(2)}× the ask over ${input.assumptions.years} years. That is a worksheet, not a forecast.`,
      stat: { value: `${model.moic.toFixed(2)}×`, label: "Base MOIC, certification-weighted" },
    },
    {
      kicker: "09  /  Risks",
      title: "How this returns zero",
      body: "These are the risks the claim type usually carries. They are not findings about this defendant.",
      bullets: risks(input.tags),
    },
    {
      kicker: "10  /  Ask",
      title: money(input.assumptions.fundingAsk),
      body: `${input.ngo} is looking for capital to carry the case through ${input.stage.toLowerCase()}. The position is a share of net recovery, not equity in the organization.`,
      bullets: [
        input.counsel,
        input.jurisdiction,
        input.tags.length ? input.tags.join(" · ") : "No tags in the folder",
      ],
      footnote: "Listing a matter on the book is a choice. Nothing is sent until you list it.",
    },
  ];
}

function proceeds(tags: string[], stage: string): string[] {
  const items = [
    `${stage}: pleadings, case management, and a first document protocol.`,
  ];
  if (tags.some((tag) => /environment|pfas|medical/.test(tag))) {
    items.push("Exposure reconstruction, water or site modeling, and a monitoring design an expert will sign.");
  }
  if (tags.some((tag) => /wage|employment/.test(tag))) {
    items.push("Timeclock reconstruction, exemption analysis, and a notice plan for a collective.");
  }
  if (tags.some((tag) => /privacy|healthcare/.test(tag))) {
    items.push("Forensic timeline, a statutory-damages map, and standing work before notice is printed.");
  }
  items.push("Damages expert, and a reserve for certification briefing.");
  return items.slice(0, 4);
}

function risks(tags: string[]): string[] {
  const items = [
    "Certification can be denied. Most of the budget is stranded if the common case ends there.",
    "Defendant capacity is an input from the folder, not a conclusion about insurance or cash.",
  ];
  if (tags.some((tag) => /environment|pfas|medical/.test(tag))) {
    items.push("Medical monitoring is uneven across states. Choice of law can shrink the class.");
    items.push("If exposure has to be proved house by house, predominance is the case.");
  }
  if (tags.some((tag) => /wage|employment/.test(tag))) {
    items.push("Arbitration clauses and exemption defenses can empty the collective before merits.");
  }
  if (tags.some((tag) => /privacy|healthcare/.test(tag))) {
    items.push("Standing and statutory caps can make a large class a small recovery.");
  }
  return items.slice(0, 4);
}

function readAssumptions(text: string, gaps: string[]): Assumptions {
  const take = (label: string, fallback: number, gap: string) => {
    const value = num(text, label);
    if (value === undefined) gaps.push(gap);
    return value ?? fallback;
  };

  return {
    classSize: take("CLASS SIZE", 1000, "class"),
    classUnit: field(text, "CLASS UNIT") ?? "people",
    participation: take("PARTICIPATION", 0.5, "participation"),
    primaryHarm: take("PRIMARY HARM", 1000, "primary harm"),
    primaryLabel: field(text, "PRIMARY LABEL") ?? "Primary harm, per person",
    secondaryHarm: take("SECONDARY HARM", 0, "secondary harm"),
    secondaryLabel: field(text, "SECONDARY LABEL") ?? "Secondary harm",
    secondaryShare: take("SECONDARY SHARE", 0, "secondary share"),
    defendantCapacity: take("DEFENDANT CAPACITY", 50_000_000, "capacity"),
    counselFee: take("COUNSEL FEE", 0.3, "counsel fee"),
    fundingAsk: take("FUNDING ASK", 1_000_000, "ask"),
    fundShare: take("FUND SHARE", 0.15, "fund share"),
    certProbability: take("CERT PROBABILITY", 0.45, "certification"),
    years: take("YEARS", 4, "duration"),
  };
}

function readRules(text: string): RuleFactor[] {
  const found: RuleFactor[] = [];
  const pattern = /^RULE23:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|\s*(.+)$/gim;
  for (const match of text.matchAll(pattern)) {
    found.push({
      factor: match[1].trim(),
      rule: match[2].trim(),
      score: Math.max(0, Math.min(100, Number(match[3]))),
      note: match[4].trim(),
    });
  }
  return found.length ? found : FALLBACK_RULES.map((rule) => ({ ...rule }));
}

function pullQuote(files: DocketFile[]) {
  let best: { quote: string; source: string } | null = null;
  for (const file of files) {
    if (file.name.startsWith("01-")) continue;
    const paragraphs = file.text
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(
      (paragraph) =>
        paragraph.length > 140 &&
        !paragraph.startsWith("RULE23:") &&
        !/^proposed class\b/i.test(paragraph) &&
        !/^outline for\b/i.test(paragraph),
    );
    for (const paragraph of paragraphs) {
      const sentence = paragraph.split(/(?<=\.)\s/)[0]?.trim();
      if (!sentence) continue;
      if (!best || sentence.length > best.quote.length) {
        best = { quote: sentence.slice(0, 420), source: file.name };
      }
    }
  }
  return best;
}

function theoriesFrom(text: string, tags: string[]) {
  const stated = listField(text, "THEORIES");
  if (stated.length) return stated;
  const found: string[] = [];
  const pairs: [RegExp, string][] = [
    [/public nuisance/i, "Public nuisance"],
    [/negligen/i, "Negligence"],
    [/medical monitoring/i, "Medical monitoring"],
    [/flsa|overtime|unpaid wage/i, "Unpaid wages"],
    [/misclassif/i, "Misclassification"],
    [/data breach|privacy/i, "Privacy and data security"],
    [/consumer/i, "Consumer protection"],
    [/trespass/i, "Trespass"],
  ];
  for (const [pattern, label] of pairs) {
    if (pattern.test(text)) found.push(label);
  }
  if (found.length) return found;
  return tags.map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1));
}

function tagsFrom(text: string) {
  const stated = listField(text, "TAGS", ",");
  if (stated.length) return stated.map((tag) => tag.toLowerCase());
  const tags: string[] = [];
  if (/pfas|pfoa|pfos/i.test(text)) tags.push("environmental", "pfas");
  if (/wage|flsa|overtime/i.test(text)) tags.push("wage", "employment");
  if (/breach|privacy|hipaa/i.test(text)) tags.push("privacy");
  if (/medical monitoring/i.test(text)) tags.push("medical-monitoring");
  return [...new Set(tags)];
}

function field(text: string, label: string) {
  const match = text.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim();
}

function listField(text: string, label: string, separator = "|") {
  const raw = field(text, label);
  if (!raw) return [];
  return raw
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function num(text: string, label: string) {
  const raw = field(text, label);
  if (!raw) return undefined;
  const value = Number(raw.replace(/[$,%\s,]/g, ""));
  return Number.isFinite(value) ? value : undefined;
}

function titleFromFiles(files: DocketFile[]) {
  if (!files.length) return "Untitled matter";
  return files[0].name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
}

function makeId(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28);
  return `${slug || "matter"}-${Math.random().toString(36).slice(2, 7)}`;
}
