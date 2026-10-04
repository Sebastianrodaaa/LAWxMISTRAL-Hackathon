export async function mistralError(response: Response) {
  let message = "";
  try {
    const data = (await response.json()) as { message?: unknown };
    if (typeof data.message === "string") message = data.message;
  } catch {
    message = "";
  }
  const reason = message.replace(/\s+/g, " ").trim() || "request failed";
  return `Mistral returned ${response.status}: ${reason}`.slice(0, 180);
}

export function deskWarning(error: unknown) {
  const detail = error instanceof Error && error.message ? error.message : "Mistral was unavailable.";
  return `${detail} The desk draft was kept.`.slice(0, 240);
}
