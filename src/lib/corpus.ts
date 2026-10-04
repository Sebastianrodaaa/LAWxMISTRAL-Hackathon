import type { Hit } from "./types";

export const corpus: Hit[] = [
  {
    title: "PFAS drinking-water settlements as a comparable set",
    publisher: "Atrium source library",
    date: "2024",
    origin: "library",
    excerpt:
      "Public water-system settlements against 3M (up to about $10.3 billion) and against DuPont, Chemours, and Corteva (about $1.2 billion) are system-wide infrastructure cases. A household medical-monitoring class is a different claimant, a different damage, and usually a much smaller number. Use them as ceiling context, not as a comp multiple.",
    tags: ["pfas", "environmental", "settlement"],
  },
  {
    title: "Medical monitoring is a state-law question",
    publisher: "Atrium source library",
    date: "2025",
    origin: "library",
    excerpt:
      "Some states allow a medical-monitoring remedy without a present physical injury. Others require a present injury, or reject the remedy outright. A multi-state class that treats monitoring as one common damage is where predominance usually breaks. The funding memo should name the forum and the states inside the class definition.",
    tags: ["medical-monitoring", "environmental", "predominance"],
  },
  {
    title: "Rule 23(b)(3) predominance in exposure cases",
    publisher: "Atrium source library",
    date: "2025",
    origin: "library",
    excerpt:
      "Numerosity is rarely the fight when a utility or an employer defines the group. Predominance is. If exposure, hours, or injury has to be tried person by person, the common questions do not win the case. A worksheet score above 70 on numerosity and below 50 on predominance is a certification risk, not a contradiction.",
    tags: ["rule 23", "predominance", "certification"],
  },
  {
    title: "What a funding multiple is actually pricing",
    publisher: "Atrium source library",
    date: "2025",
    origin: "library",
    excerpt:
      "Single-case litigation funding is often priced as a multiple of capital deployed or as a share of recovery, not as equity in the NGO. Duration, certification risk, and collectability dominate the price. A 2–4× outcome on committed capital over three to six years is a commonly discussed range in the trade press; it is not a promise, and many positions return zero.",
    tags: ["funding", "multiple", "hedge fund"],
  },
  {
    title: "Maintenance, champerty, and the modern funder",
    publisher: "Atrium source library",
    date: "2024",
    origin: "library",
    excerpt:
      "Historic bars on funding someone else's lawsuit have been narrowed in most US jurisdictions, and a few states still police control. The commercial question is separate from the legal one: who instructs counsel, who may settle, and whether the funder's consent right makes it a party in substance. Read the term sheet against the forum's rules before treating a deck as investable.",
    tags: ["funding", "champerty", "control"],
  },
  {
    title: "FLSA collectives and state-law wage classes",
    publisher: "Atrium source library",
    date: "2025",
    origin: "library",
    excerpt:
      "A federal wage case is often two proceedings: an FLSA collective, which workers join, and a state-law class, which they must leave. Arbitration clauses and exemption defenses (the 'shift lead' who cannot hire or fire) decide more outcomes than the size of the class on the cover. Timeclock extracts are the document that matters.",
    tags: ["wage", "employment", "flsa"],
  },
  {
    title: "Data-breach classes after the standing cases",
    publisher: "Atrium source library",
    date: "2025",
    origin: "library",
    excerpt:
      "A bare risk of future harm is a weak federal standing theory. Cases that survive usually have misuse, a cost already paid, or a statute that creates a damages right the legislature actually wrote. A 1 million-person class with a low participation rate and a statutory cap can be a smaller recovery than the cover slide implies.",
    tags: ["privacy", "healthcare", "standing"],
  },
  {
    title: "NGO plaintiffs and adequacy",
    publisher: "Atrium source library",
    date: "2025",
    origin: "library",
    excerpt:
      "An organization can be a useful plaintiff and a difficult one. Adequacy asks whether the representative will protect absent class members, whether it has a conflict, and whether counsel is driving the case. Funders should read the NGO's governance and its other litigation, not only the complaint outline.",
    tags: ["ngo", "adequacy", "rule 23"],
  },
  {
    title: "Defendant capacity is not a balance-sheet footnote",
    publisher: "Atrium source library",
    date: "2025",
    origin: "library",
    excerpt:
      "Insurance towers, indemnity agreements, and bankruptcy risk cap what a judgment can collect. A damages worksheet that exceeds the tower is a negotiating document, not an expected value. Ask which policies are burning, which years are impaired, and whether a co-defendant is the real payor.",
    tags: ["capacity", "insurance", "damages"],
  },
].map((item) => ({
  title: item.title,
  publisher: item.publisher,
  date: item.date,
  origin: "library" as const,
  excerpt: item.excerpt,
}));

const STOP = new Set([
  "class",
  "case",
  "cases",
  "claim",
  "claims",
  "court",
  "action",
  "actions",
  "about",
  "from",
  "with",
  "that",
  "this",
  "their",
  "there",
  "which",
  "would",
  "could",
  "legal",
  "lawsuit",
  "matter",
  "funding",
  "against",
  "under",
  "after",
  "before",
  "between",
]);

export function rankLibrary(query: string, limit = 6): Hit[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !STOP.has(word));
  if (!terms.length) return corpus.slice(0, limit);

  return corpus
    .map((hit) => {
      const hay = `${hit.title} ${hit.excerpt}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (hay.includes(term) ? 1 : 0), 0);
      return { hit, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.hit);
}

export function stitchReading(query: string, hits: Hit[], live: boolean): string {
  if (!hits.length) {
    return `Nothing on the desk matches “${query}”. Add TAVILY_API_KEY on the server to search the live web. The source library will still be labeled separately from anything that comes back.`;
  }
  const lead = hits
    .slice(0, 3)
    .map((hit) => `${hit.title} (${hit.publisher}): ${hit.excerpt}`)
    .join(" ");
  const scope = live
    ? "The note below mixes the Atrium source library with live web results. Each source is labeled."
    : "The note below uses only the Atrium source library. It is not a search of the live web.";
  return `Reading “${query}”. ${scope} ${lead} This is a research note for a funding read. It is not a legal opinion and not a recommendation to fund.`;
}
