import type { Metadata } from "next";
import { CaseView } from "@/components/case-view";

export const metadata: Metadata = { title: "Matter" };

export default function Page() {
  return <CaseView />;
}
