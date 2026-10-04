import type { ChatDone, ChatEvent } from "./chat-events";

export async function readChat(response: Response, onEvent: (event: ChatEvent) => void): Promise<ChatDone> {
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const data = (await response.json()) as { error?: string; text?: string } & Partial<ChatDone>;
    if (!response.ok) throw new Error(data.error || "The desk did not answer.");
    const done: ChatDone = {
      type: "done",
      source: data.source === "mistral" ? "mistral" : "desk",
      model: data.model,
      text: data.text || "",
      warning: data.warning,
      reflection: data.reflection,
      confidence: data.confidence,
      debate: data.debate,
      steps: data.steps,
      citations: data.citations,
      memories: data.memories,
    };
    if (done.text) onEvent({ type: "token", text: done.text });
    onEvent(done);
    return done;
  }
  if (!response.ok || !response.body) throw new Error("The desk did not answer.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done: ChatDone | null = null;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as ChatEvent;
      if (event.type === "error") throw new Error(event.message);
      if (event.type === "done") done = event;
      onEvent(event);
    }
  }
  if (!done?.text) throw new Error("The desk did not answer.");
  return done;
}
