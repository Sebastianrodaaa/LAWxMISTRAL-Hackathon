import type { DocketFile } from "./types";

function file(name: string, text: string): DocketFile {
  const kind = name.split(".").pop() ?? "txt";
  return { name, kind, text: text.trim() };
}

export const riverbendFiles: DocketFile[] = [
  file(
    "01-index.md",
    `
CAPTION: Riverwatch Alliance v. Helion Chemical Co.
TITLE: Riverbend PFAS
NGO: Riverwatch Alliance
FOCUS: Drinking-water communities on the Riverbend system
JURISDICTION: Southern District of Ohio
STAGE: Pre-certification
COUNSEL: Cho & Adelman LLP
CLASS SIZE: 42180
CLASS UNIT: households
PARTICIPATION: 0.55
PRIMARY HARM: 2800
PRIMARY LABEL: Medical monitoring, per household
SECONDARY HARM: 22000
SECONDARY LABEL: Property diminution
SECONDARY SHARE: 0.4
DEFENDANT CAPACITY: 900000000
COUNSEL FEE: 0.25
FUNDING ASK: 4200000
FUND SHARE: 0.14
CERT PROBABILITY: 0.52
YEARS: 4.5
TAGS: environmental, pfas, medical-monitoring
THEORIES: Public nuisance | Negligence | Medical monitoring | Trespass to drinking water
UPDATED: 4 Oct 2026
SUMMARY: Helion Chemical ran a fluoropolymer line at Midland for twenty-six years. A 2024 EPA notice records PFOA and PFOS in finished water above the national primary drinking-water levels. Riverwatch proposes a class of 42,180 households on the Riverbend system from 1998 through 2024, seeking monitoring and the lost value of residential property.
RULE23: Numerosity | 23(a)(1) | 90 | 42,180 households on one finished-water system.
RULE23: Commonality | 23(a)(2) | 76 | Common plant, common utility, common chemicals named in the notice.
RULE23: Typicality | 23(a)(3) | 70 | Named households are on the same system. Exposure duration still varies.
RULE23: Adequacy | 23(a)(4) | 64 | Riverwatch is a membership NGO. Governance memo is in the folder; conflicts are not fully papered.
RULE23: Predominance | 23(b)(3) | 58 | Monitoring may be common. Property diminution and individual exposure are the fight.
RULE23: Superiority | 23(b)(3) | 72 | Household claims are too small to bring alone. A class is the only realistic proceeding.
`,
  ),
  file(
    "02-complaint-outline.md",
    `
Outline for a funding read. This is not a filed pleading.

Riverwatch Alliance sues for itself and for households served by the Riverbend municipal system. The outline pleads public nuisance, negligence, medical monitoring, and trespass to drinking water against Helion Chemical Co. It does not name the utility as a damages defendant. The utility is described as the system that delivered finished water.

The proposed class period runs from 1998, when the Midland line expanded, through 2024, when the notice of violation was issued. Class counsel in the outline is Cho & Adelman LLP. No engagement letter is in this folder. The funding ask is meant to carry the case from filing through a certification hearing, including the exposure expert and a monitoring design.
`,
  ),
  file(
    "03-epa-notice.md",
    `
Reading note on the 2024 EPA notice of violation, prepared by Riverwatch's science advisor. This is a summary of a public notice, not the notice itself.

The notice records PFOA and PFOS in finished water from the Riverbend plant above the national primary drinking-water levels set for those two chemicals. It identifies Helion's Midland fluoropolymer line as an upstream discharger the agency was already inspecting. It does not, on its own, assign a dollar figure to household harm, and it does not decide medical monitoring.

Riverwatch treats the notice as the document that makes the chemicals, the plant, and the utility the same story. Individual tap-water tests in the folder cover 86 homes. They are a sample, not the class.
`,
  ),
  file(
    "04-damages-notes.md",
    `
Damages notes for the worksheet. Figures below are the ones the index uses.

Medical monitoring is carried at $2,800 per household: a baseline visit, a follow-up panel, and a ten-year reminder protocol. The advisor's range in the underlying memo was $1,900 to $4,100. Property diminution is carried at $22,000 per owner-occupied household, applied to 40 percent of the class, from a county assessor comparison of Riverbend sales against two upstream towns in 2022–2024. That comparison is not an appraisal.

Helion's last reported cash and undrawn facilities, from its public annual report, are the source of the $900 million capacity cap. Insurance is not scheduled in this folder. If the tower is shorter than cash, the worksheet is high.
`,
  ),
  file(
    "05-class-definition.md",
    `
Proposed class: all persons who, between 1 January 1998 and 31 December 2024, resided in a household receiving finished water from the Riverbend municipal system for at least twelve consecutive months.

Riverwatch counts 42,180 such households from utility account rolls. The rolls are in the folder as an aggregate. They are not a list of names. The organization asks that notice, if any, wait until a certification ruling. Membership is through the watershed association; the named households in the outline are members.
`,
  ),
];

export const nightshiftFiles: DocketFile[] = [
  file(
    "01-index.md",
    `
CAPTION: ShiftRights Collective v. Harborline Logistics Inc.
TITLE: Nightshift wages
NGO: ShiftRights Collective
FOCUS: Overnight warehouse workers classified as exempt leads
JURISDICTION: Northern District of Illinois
STAGE: Pre-filing
COUNSEL: Ibarra Wage Group
CLASS SIZE: 18400
CLASS UNIT: workers
PARTICIPATION: 0.48
PRIMARY HARM: 6800
PRIMARY LABEL: Unpaid pre-shift and off-clock time
SECONDARY HARM: 6800
SECONDARY LABEL: Liquidated damages
SECONDARY SHARE: 0.8
DEFENDANT CAPACITY: 250000000
COUNSEL FEE: 0.3
FUNDING ASK: 2100000
FUND SHARE: 0.16
CERT PROBABILITY: 0.64
YEARS: 3.5
TAGS: wage, employment
THEORIES: Unpaid wages | Misclassification | Recordkeeping failures
UPDATED: 4 Oct 2026
SUMMARY: ShiftRights alleges that Harborline Logistics classified 18,400 overnight warehouse workers as exempt shift leads even though they could not hire, fire, or set a schedule. Timeclock extracts show unpaid security screening and off-the-clock close. The ask covers reconstruction of six years of clock data and notice.
RULE23: Numerosity | 23(a)(1) | 86 | 18,400 workers on one job code across four buildings.
RULE23: Commonality | 23(a)(2) | 80 | A single pay-code policy is the common question.
RULE23: Typicality | 23(a)(3) | 74 | Named workers held the same code. Overtime totals differ.
RULE23: Adequacy | 23(a)(4) | 71 | ShiftRights is a worker center. It is not seeking a service award that competes with the class.
RULE23: Predominance | 23(b)(3) | 68 | The exemption turns on duties written into the code. Individual hours go to damages.
RULE23: Superiority | 23(b)(3) | 77 | Individual wage claims are smaller than the cost of bringing them.
`,
  ),
  file(
    "02-duties-memo.md",
    `
Duties memo from worker interviews. Eighteen night-shift leads at the Joliet and Romeoville buildings were interviewed in 2025. None had authority to hire, fire, or promote. Schedules were set by a salaried operations manager. The job description Harborline used for the exemption calls the role supervisory. The interviews say the work was scanning, stacking, and unlocking cages.

If those duties are representative, the exemption is a common question. If Harborline can show that leads at other buildings really supervised, typicality narrows. The folder does not yet include a company-wide job study.
`,
  ),
  file(
    "03-timeclock-notes.md",
    `
Notes on a sample of timeclock extracts for 640 workers, 2019 through 2024. Screening at the gate starts, on the badge reader, an average of 14 minutes before the paid punch. Close-down after the paid punch averages 11 minutes on three of five weeknights. The sample is not random. It is the workers who still had badge exports on a personal drive after leaving.

Unpaid time on the worksheet is carried at $6,800 per worker across the class period, with liquidated damages as a second line because the Fair Labor Standards Act allows them when the violation is not in good faith. Whether good faith can be decided commonly is open. Arbitration agreements are rumored and not in the folder.
`,
  ),
];

export const mercyFiles: DocketFile[] = [
  file(
    "01-index.md",
    `
CAPTION: Patient Ledger v. Mercy Regional Health
TITLE: Mercy record exposure
NGO: Patient Ledger
FOCUS: Patients whose discharge records sat in an open storage bucket
JURISDICTION: Eastern District of Pennsylvania
STAGE: Investigation, pre-filing
COUNSEL: Voss Privacy LLP
CLASS SIZE: 1200000
CLASS UNIT: patients
PARTICIPATION: 0.12
PRIMARY HARM: 2500
PRIMARY LABEL: Statutory and out-of-pocket harm, per participating patient
SECONDARY HARM: 800
SECONDARY LABEL: Credit and identity monitoring already purchased
SECONDARY SHARE: 0.5
DEFENDANT CAPACITY: 2000000000
COUNSEL FEE: 0.25
FUNDING ASK: 6000000
FUND SHARE: 0.12
CERT PROBABILITY: 0.42
YEARS: 4
TAGS: privacy, healthcare, consumer
THEORIES: Negligence | State consumer statutes | Breach of confidence
UPDATED: 4 Oct 2026
SUMMARY: Patient Ledger alleges Mercy Regional left a storage bucket of discharge summaries reachable without a password for eleven months. The proposed class is about 1.2 million patients across four states. The folder holds a forensic timeline, the state attorney general's inquiry letter, and a statutory-damages map. Standing is the first risk, not numerosity.
RULE23: Numerosity | 23(a)(1) | 92 | About 1.2 million patients in the exposed bucket.
RULE23: Commonality | 23(a)(2) | 73 | One bucket, one window of exposure, one defendant policy on storage.
RULE23: Typicality | 23(a)(3) | 60 | Named patients had sensitive discharge notes. Many records were administrative.
RULE23: Adequacy | 23(a)(4) | 66 | Patient Ledger is a new organization. Funding should not outvote the patients.
RULE23: Predominance | 23(b)(3) | 48 | Misuse and dollars spent will differ. Statutory damages may carry the common question, or may not.
RULE23: Superiority | 23(b)(3) | 70 | Individual privacy claims are uneconomic. A class is the practical path if standing holds.
`,
  ),
  file(
    "02-forensic-timeline.md",
    `
Forensic timeline prepared by an outside firm for Patient Ledger. The bucket was created on 2 March 2024. A configuration change on 18 March 2024 removed the credential requirement from one prefix. That prefix held discharge summaries, not images. The opening was closed on 11 February 2025 after a reporter's tip. Mercy notified patients in April 2025.

The timeline does not show who downloaded files. It shows that the files could be listed and fetched. Logs of external fetches are incomplete for the first four months. That gap is why the standing section of any complaint will be argued, and why the worksheet uses a low participation rate.
`,
  ),
  file(
    "03-ag-inquiry.md",
    `
Summary of a letter from the Pennsylvania attorney general's office to Mercy Regional, May 2025. The letter asks for the categories of records, the number of patients, the date the opening began, and the date it was closed. It is an inquiry, not a complaint, and it does not find a violation.

Patient Ledger has the letter because a patient who is a member forwarded it. Counsel has not been retained by the state. Nothing in this folder should be described as a government case. The four states in the proposed class are Pennsylvania, New Jersey, Delaware, and Maryland, because those are the states Mercy billed from the exposed prefix.
`,
  ),
  file(
    "04-statutory-map.md",
    `
Statutory-damages map, working draft.

Pennsylvania's breach-notice statute is primarily a notice statute. New Jersey and Maryland have consumer-protection theories that plaintiffs have tried in breach cases, with mixed results on standing and on whether a statutory penalty can be decided for a class. The worksheet carries $2,500 per participating patient as a blended figure for statutory and documented out-of-pocket harm, not as a penalty the statutes automatically award.

Participation is set at 12 percent because breach classes that claim only a risk of future harm rarely keep the whole list. If the case is later limited to patients who already paid for monitoring or who show misuse, both the class and the gross recovery shrink. The $6 million ask is discovery, forensics, and certification briefing, not a notice program to 1.2 million people.
`,
  ),
];
