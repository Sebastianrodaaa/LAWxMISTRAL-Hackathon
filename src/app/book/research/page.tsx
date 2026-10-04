import type { Metadata } from "next";
import { ResearchPanel } from "@/components/research-panel";
import { ReadingAs } from "@/components/reading-as";
import { Kicker } from "@/components/ui";

export const metadata: Metadata = { title: "Research" };

export default function Page() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:px-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <Kicker n="02">Deep research</Kicker>
        <h1 className="mt-3 font-serif text-4xl tracking-tight md:text-5xl">
          Read the record before the call.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          The desk library covers certification, funding terms, wage collectives, privacy standing, and PFAS comparables. Live web results appear only when a search key is configured, and they are labeled apart from the library.
        </p>
        <div className="mt-8">
          <ResearchPanel />
        </div>
      </div>
      <ReadingAs />
    </div>
  );
}
