export type ChatCitation = {
  n: number;
  title: string;
  publisher: string;
  origin: "library" | "web" | "folder";
  excerpt: string;
  url?: string;
};

export type ChatStep = {
  tool: string;
  label: string;
  detail: string;
  href?: string;
};

export type ChatDebate = {
  round: number;
  critic: string;
  verdict: "needs_revision" | "acceptable";
};

export type ChatDone = {
  type: "done";
  source: "mistral" | "desk";
  model?: string;
  text: string;
  warning?: string;
  reflection?: string;
  confidence?: number;
  debate?: ChatDebate[];
  steps?: ChatStep[];
  citations?: ChatCitation[];
  memories?: string[];
};

export type ChatEvent =
  | { type: "status"; label: string }
  | { type: "citations"; citations: ChatCitation[] }
  | { type: "step"; step: ChatStep }
  | { type: "round"; round: number; verdict: "needs_revision" | "acceptable"; critic: string }
  | { type: "token"; text: string }
  | ChatDone
  | { type: "error"; message: string };

export function ndjsonResponse(run: (send: (event: ChatEvent) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ChatEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await run(send);
      } catch (error) {
        const message = error instanceof Error ? error.message : "The desk did not answer.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
