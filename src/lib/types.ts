export type DocketFile = {
  name: string;
  kind: string;
  text: string;
};

export type Slide = {
  kicker: string;
  title: string;
  body: string;
  bullets?: string[];
  stat?: { value: string; label: string };
  footnote?: string;
};

export type RuleFactor = {
  factor: string;
  rule: string;
  score: number;
  note: string;
};

export type Assumptions = {
  classSize: number;
  classUnit: string;
  participation: number;
  primaryHarm: number;
  primaryLabel: string;
  secondaryHarm: number;
  secondaryLabel: string;
  secondaryShare: number;
  defendantCapacity: number;
  counselFee: number;
  fundingAsk: number;
  fundShare: number;
  certProbability: number;
  years: number;
};

export type Matter = {
  id: string;
  title: string;
  caption: string;
  ngo: string;
  focus: string;
  jurisdiction: string;
  stage: string;
  counsel: string;
  tags: string[];
  theories: string[];
  summary: string;
  documents: DocketFile[];
  slides: Slide[];
  rule23: RuleFactor[];
  assumptions: Assumptions;
  gaps: string[];
  origin: "library" | "desk";
  shared: boolean;
  updated: string;
};

export type FundProfile = {
  who: string;
  book: string;
  looksFor: string;
  passes: string;
  read: string;
};

export type Fund = {
  id: string;
  name: string;
  kind: "Hedge fund" | "Litigation funder" | "Impact desk";
  city: string;
  thesis: string;
  checkMin: number;
  checkMax: number;
  tags: string[];
  aum: string;
  readTime: string;
  profile: FundProfile;
};

export type Interest = {
  id: string;
  matterId: string;
  fundId: string;
  note: string;
  at: string;
};

export type Delivery = {
  id: string;
  matterId: string;
  fundId: string;
  at: string;
};

export type Sanction = {
  id: string;
  title: string;
  authority: string;
  program: string;
  status: "Active";
  issued: string;
  designated: string;
  summary: string;
  measures: string[];
  tags: string[];
  files: DocketFile[];
};

export type Hit = {
  title: string;
  publisher: string;
  url?: string;
  excerpt: string;
  origin: "library" | "web";
  date?: string;
};

export type TraceStep = {
  id: string;
  label: string;
  detail: string;
};
