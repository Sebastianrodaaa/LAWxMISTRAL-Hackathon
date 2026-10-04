import type { Fund } from "./types";

export const funds: Fund[] = [
  {
    id: "northline",
    name: "Northline Litigation Partners",
    kind: "Litigation funder",
    city: "New York / London",
    thesis:
      "Single-case and portfolio funding through class certification, with a preference for environmental and consumer claims that already have a regulator in the file.",
    checkMin: 2_000_000,
    checkMax: 12_000_000,
    tags: ["environmental", "medical-monitoring", "consumer", "pfas"],
    aum: "$1.4B",
    readTime: "11 days",
  },
  {
    id: "hale",
    name: "Hale Meridian",
    kind: "Hedge fund",
    city: "New York",
    thesis:
      "Event-driven book. Takes litigation as a special situation when the defendant is public, the docket is real, and the check is large enough to matter to the fund.",
    checkMin: 5_000_000,
    checkMax: 40_000_000,
    tags: ["environmental", "pfas", "antitrust", "consumer"],
    aum: "$6.2B",
    readTime: "18 days",
  },
  {
    id: "civic",
    name: "Civic Yield",
    kind: "Impact desk",
    city: "Chicago",
    thesis:
      "Funds NGO plaintiffs in wage, privacy, and environmental cases. Will take a smaller check if the class is the point of the case, not an afterthought.",
    checkMin: 500_000,
    checkMax: 6_000_000,
    tags: ["wage", "employment", "privacy", "environmental"],
    aum: "$420M",
    readTime: "9 days",
  },
  {
    id: "vesper",
    name: "Vesper Opportunity",
    kind: "Hedge fund",
    city: "San Francisco",
    thesis:
      "Data, healthcare, and consumer books. Reads statutory-damages maps and standing risk before it reads the story.",
    checkMin: 3_000_000,
    checkMax: 18_000_000,
    tags: ["privacy", "healthcare", "consumer"],
    aum: "$2.1B",
    readTime: "14 days",
  },
  {
    id: "harbor",
    name: "Blackwater Harbor",
    kind: "Litigation funder",
    city: "Houston",
    thesis:
      "Mass tort and environmental only. Does not fund wage cases. Check size starts where a single expert program becomes the budget.",
    checkMin: 10_000_000,
    checkMax: 50_000_000,
    tags: ["environmental", "pfas", "medical-monitoring"],
    aum: "$3.0B",
    readTime: "21 days",
  },
  {
    id: "lantern",
    name: "Lantern Special Situations",
    kind: "Hedge fund",
    city: "Boston",
    thesis:
      "Labor and consumer situations with a document trail: timeclocks, pay codes, and a defendant that can pay a judgment.",
    checkMin: 4_000_000,
    checkMax: 20_000_000,
    tags: ["wage", "employment", "consumer"],
    aum: "$1.8B",
    readTime: "12 days",
  },
];

export function fundById(id: string) {
  return funds.find((fund) => fund.id === id) ?? funds[0];
}
