import type { Metadata } from "next";
import { NgoDashboard } from "@/components/ngo-dashboard";

export const metadata: Metadata = { title: "Generate" };

export default function Page() {
  return <NgoDashboard entryNav="generate" />;
}
