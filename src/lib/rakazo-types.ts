export const AGENT_MODELS = [
  { id: "default", label: "Mistral" },
  { id: "mistral-medium-3-5", label: "Mistral Medium" },
  { id: "mistral-small-latest", label: "Mistral Small" },
  { id: "mistral-large-latest", label: "Mistral Large" },
] as const;

export type AgentModelId = (typeof AGENT_MODELS)[number]["id"];

export type MatterBrief = {
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
  gaps: string[];
  fundingAsk: number;
  classSize: number;
  classUnit: string;
  documents: { name: string; kind: string; text: string }[];
};

export type AgentStep = {
  tool: string;
  label: string;
  detail: string;
};

export type AgentSource = "mistral" | "desk";

export type RakazoMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  steps?: AgentStep[];
  source?: AgentSource;
  model?: string;
  warning?: string;
  reflection?: string;
  confidence?: number;
  debate?: { round: number; critic: string; verdict: "needs_revision" | "acceptable" }[];
};

export type RakazoThread = {
  id: string;
  title: string;
  matterId: string;
  messages: RakazoMessage[];
  updated: string;
};

export type RakazoMemory = {
  id: string;
  note: string;
  at: string;
};

export type RakazoRoutine = {
  id: string;
  label: string;
  prompt: string;
};

export type RakazoState = {
  threads: RakazoThread[];
  activeId: string;
  memory: RakazoMemory[];
  routines: RakazoRoutine[];
  model: AgentModelId;
};
