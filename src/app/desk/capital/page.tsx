import type { Metadata } from "next";
import { Suspense } from "react";
import { CapitalDirectory } from "@/components/capital-directory";

export const metadata: Metadata = { title: "Capital" };

export default function Page() {
  return (
    <Suspense fallback={<p className="px-6 py-16 text-muted">Loading capital…</p>}>
      <CapitalDirectory />
    </Suspense>
  );
}
