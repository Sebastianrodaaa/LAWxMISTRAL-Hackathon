export type HarnessDebate = {
  round: number;
  critic: string;
  verdict: "needs_revision" | "acceptable";
};

export function HarnessNote({
  reflection,
  confidence,
  debate,
}: {
  reflection?: string;
  confidence?: number;
  debate?: HarnessDebate[];
}) {
  const rounds = debate?.filter((round) => round.critic) ?? [];
  if (!reflection && typeof confidence !== "number" && rounds.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      {typeof confidence === "number" ? (
        <p className="text-[11px] tracking-wide text-faint uppercase">
          Scholar confidence {Math.round(confidence * 100)}%
        </p>
      ) : null}
      {reflection ? <p className="text-sm leading-relaxed text-muted">{reflection}</p> : null}
      {rounds.length ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-[11px] font-medium text-gold">
            Scholar and critic · {rounds.length} round{rounds.length === 1 ? "" : "s"}
          </summary>
          <ol className="mt-2 space-y-2">
            {rounds.map((round) => (
              <li key={round.round}>
                <p className="text-[11px] text-faint">
                  Round {round.round} · {round.verdict === "needs_revision" ? "Needs revision" : "Acceptable"}
                </p>
                <p className="text-sm leading-relaxed text-paper">{round.critic}</p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}
