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
    profile: {
      who: "A litigation finance partnership with desks in New York and London. The book is single cases and small portfolios, held through class certification.",
      book: "Environmental and consumer claims, with a preference for files that already contain a regulator.",
      looksFor: "A caption, a class definition, and a public record that predates the funding ask.",
      passes: "Wage-only files, and matters that do not name a forum.",
      read: "Eleven days. The folder is read before anyone takes a call.",
    },
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
    profile: {
      who: "An event-driven hedge fund in New York. Litigation sits inside a larger book as a special situation. It is not the whole firm.",
      book: "Public-company defendants, a docket that already exists or is ready to be filed, and a check large enough to matter to the fund.",
      looksFor: "A named defendant that can pay, and a proceeding with a court or a filing date.",
      passes: "Pre-filing worksheets with no defendant capacity, and checks under $5 million.",
      read: "Eighteen days. The docket is read before the narrative.",
    },
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
    profile: {
      who: "An impact desk in Chicago that funds NGO plaintiffs. The class is the point of the case, not a cover for a smaller dispute.",
      book: "Wage, privacy, and environmental matters. The checks are smaller than the hedge-fund book.",
      looksFor: "An NGO that can stay adequate for absent class members, and a class definition that is the case.",
      passes: "Files where the NGO is only a vehicle for counsel, and matters with no account of who was harmed.",
      read: "Nine days. Governance of the NGO is part of the read.",
    },
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
    profile: {
      who: "A San Francisco hedge fund. The book is data, healthcare, and consumer claims.",
      book: "Statutory-damages maps and standing are read before the story of the case.",
      looksFor: "A statute that creates a damages right, and a harm that is already in the file.",
      passes: "A bare risk of future harm, and a class defined only by a headcount.",
      read: "Fourteen days.",
    },
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
    profile: {
      who: "A Houston litigation funder. The book is mass tort and environmental cases only.",
      book: "Checks begin where a single expert program is the budget.",
      looksFor: "An exposure record, a medical or engineering file, and a defendant that can fund that program.",
      passes: "Wage cases. This desk does not fund them.",
      read: "Twenty-one days.",
    },
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
    profile: {
      who: "A Boston hedge fund in labor and consumer special situations.",
      book: "The read starts with the document trail: timeclocks, pay codes, and a defendant that can pay a judgment.",
      looksFor: "The records the class would be tried on, not a description of those records.",
      passes: "Folders that define a class and do not attach the documents.",
      read: "Twelve days.",
    },
  },
];

export function fundById(id: string) {
  return funds.find((fund) => fund.id === id) ?? funds[0];
}
