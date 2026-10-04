import type { DocketFile, Sanction } from "./types";

function sheet(name: string, text: string): DocketFile {
  return { name, kind: "md", text: text.trim() };
}

export const sanctions: Sanction[] = [
  {
    id: "calder-metallics",
    title: "Calder Metallics",
    authority: "OFAC",
    program: "SDN",
    status: "Active",
    issued: "12 Mar 2026",
    designated: "Calder Metallics LLC and its Gary mill",
    summary:
      "Calder Metallics is on the SDN list. US persons may not deal in its property, and banks must block accounts they hold. The public notice cites diverted steel shipments and wages withheld at the Gary mill after the freeze.",
    measures: ["Asset freeze", "US-person ban"],
    tags: ["wage", "employment"],
    files: [
      sheet(
        "calder-summary.md",
        `
CAPTION: Shift Ledger v. Calder Metallics LLC
TITLE: Calder Metallics wages
NGO: Shift Ledger
FOCUS: Mill workers unpaid after the SDN freeze
JURISDICTION: Northern District of Indiana
STAGE: Pre-filing worksheet
COUNSEL: Counsel not retained
CLASS SIZE: 2400
CLASS UNIT: workers
PARTICIPATION: 0.6
PRIMARY HARM: 8400
PRIMARY LABEL: Unpaid wages after the freeze, per worker
SECONDARY HARM: 0
SECONDARY LABEL: None stated
SECONDARY SHARE: 0
DEFENDANT CAPACITY: 180000000
COUNSEL FEE: 0.25
FUNDING ASK: 2100000
FUND SHARE: 0.16
CERT PROBABILITY: 0.48
YEARS: 3.5
TAGS: wage, employment
THEORIES: Unpaid wages | Misclassification
UPDATED: 4 Oct 2026
SUMMARY: Calder Metallics is an active SDN. The public notice bars US persons from its property and requires banks to block accounts. Shift Ledger's worksheet covers 2,400 mill workers and unpaid wages after the freeze. The designation does not state a class size or a funding ask. Those figures are the NGO's draft.
`,
      ),
    ],
  },
  {
    id: "merrow-petrochemical",
    title: "Merrow Petrochemical",
    authority: "EU Council",
    program: "Restrictive measures",
    status: "Active",
    issued: "2 Feb 2026",
    designated: "Merrow Petrochemical SA",
    summary:
      "Merrow Petrochemical is under an EU asset freeze and an export bar on fluoropolymer equipment. The notice records PFAS releases into a municipal intake that still serves the towns downstream of the plant.",
    measures: ["Asset freeze", "Export bar"],
    tags: ["environmental", "pfas", "medical-monitoring"],
    files: [
      sheet(
        "merrow-summary.md",
        `
CAPTION: Riverward Civic v. Merrow Petrochemical SA
TITLE: Merrow PFAS
NGO: Riverward Civic
FOCUS: Households downstream of the Merrow plant
JURISDICTION: Eastern District of Louisiana
STAGE: Pre-filing worksheet
COUNSEL: Counsel not retained
CLASS SIZE: 18600
CLASS UNIT: households
PARTICIPATION: 0.5
PRIMARY HARM: 3200
PRIMARY LABEL: Medical monitoring, per household
SECONDARY HARM: 14000
SECONDARY LABEL: Property diminution
SECONDARY SHARE: 0.35
DEFENDANT CAPACITY: 640000000
COUNSEL FEE: 0.25
FUNDING ASK: 5400000
FUND SHARE: 0.14
CERT PROBABILITY: 0.46
YEARS: 4.5
TAGS: environmental, pfas, medical-monitoring
THEORIES: Public nuisance | Negligence | Medical monitoring
UPDATED: 4 Oct 2026
SUMMARY: Merrow Petrochemical is under an active EU asset freeze and an export bar. The public notice records PFAS releases into a municipal intake. Riverward Civic's worksheet covers 18,600 downstream households. The designation does not state a class size or a funding ask. Those figures are the NGO's draft.
`,
      ),
    ],
  },
  {
    id: "sable-clinic",
    title: "Sable Clinic Supply",
    authority: "OFSI",
    program: "Asset freeze",
    status: "Active",
    issued: "19 Jan 2026",
    designated: "Sable Clinic Supply Ltd",
    summary:
      "Sable Clinic Supply is frozen by OFSI. UK persons cannot make funds available to it. The notice says patient-registry files moved to an unsanctioned affiliate after the freeze, and those files are still outside the clinic's control.",
    measures: ["Asset freeze", "Funds ban"],
    tags: ["privacy", "healthcare"],
    files: [
      sheet(
        "sable-summary.md",
        `
CAPTION: Patient Ledger v. Sable Clinic Supply Ltd
TITLE: Sable registry exposure
NGO: Patient Ledger
FOCUS: Patients whose registry files left the clinic after the freeze
JURISDICTION: Eastern District of Pennsylvania
STAGE: Pre-filing worksheet
COUNSEL: Counsel not retained
CLASS SIZE: 310000
CLASS UNIT: patients
PARTICIPATION: 0.22
PRIMARY HARM: 450
PRIMARY LABEL: Statutory privacy harm, per patient
SECONDARY HARM: 0
SECONDARY LABEL: None stated
SECONDARY SHARE: 0
DEFENDANT CAPACITY: 220000000
COUNSEL FEE: 0.3
FUNDING ASK: 3800000
FUND SHARE: 0.18
CERT PROBABILITY: 0.4
YEARS: 3
TAGS: privacy, healthcare
THEORIES: Privacy and data security
UPDATED: 4 Oct 2026
SUMMARY: Sable Clinic Supply is under an active OFSI asset freeze. The public notice says patient-registry files moved to an affiliate after the freeze. Patient Ledger's worksheet covers 310,000 patients. The designation does not state a class size or a funding ask. Those figures are the NGO's draft.
`,
      ),
    ],
  },
  {
    id: "brine-harbor",
    title: "Brine & Harbor Shipping",
    authority: "OFAC",
    program: "SDN",
    status: "Active",
    issued: "7 Dec 2025",
    designated: "Brine & Harbor Shipping and two hulls",
    summary:
      "Brine & Harbor Shipping is on the SDN list, including two named hulls. The notice blocks freight revenue and says crew on those hulls were kept aboard and paid off the books after the designation.",
    measures: ["Asset freeze", "Vessel block"],
    tags: ["wage", "employment", "consumer"],
    files: [
      sheet(
        "brine-summary.md",
        `
CAPTION: Harbor Watch v. Brine & Harbor Shipping
TITLE: Brine crew wages
NGO: Harbor Watch
FOCUS: Crew held and paid off the books after the SDN listing
JURISDICTION: Southern District of Texas
STAGE: Pre-filing worksheet
COUNSEL: Counsel not retained
CLASS SIZE: 860
CLASS UNIT: crew
PARTICIPATION: 0.7
PRIMARY HARM: 12600
PRIMARY LABEL: Unpaid wages after designation, per crew member
SECONDARY HARM: 0
SECONDARY LABEL: None stated
SECONDARY SHARE: 0
DEFENDANT CAPACITY: 410000000
COUNSEL FEE: 0.25
FUNDING ASK: 1600000
FUND SHARE: 0.16
CERT PROBABILITY: 0.44
YEARS: 3
TAGS: wage, employment, consumer
THEORIES: Unpaid wages
UPDATED: 4 Oct 2026
SUMMARY: Brine & Harbor Shipping is an active SDN, including two named hulls. The public notice blocks freight revenue and says crew were kept aboard and paid off the books. Harbor Watch's worksheet covers 860 crew. The designation does not state a class size or a funding ask. Those figures are the NGO's draft.
`,
      ),
    ],
  },
];

export function sanctionById(id: string) {
  return sanctions.find((item) => item.id === id);
}

export function sanctionBrief(item: Sanction) {
  return [
    "Forwarded summary.",
    "",
    item.title,
    `${item.authority} · ${item.program} · ${item.status}`,
    `Issued ${item.issued}. Designated: ${item.designated}.`,
    `Measures: ${item.measures.join(", ")}.`,
    "",
    item.summary,
    "",
    "This is a demonstration summary, not a live sanctions list and not a finding that anyone is designated.",
  ].join("\n");
}
