import type { Metadata } from "next";
import { Diligence } from "@/components/diligence";

export const metadata: Metadata = { title: "Diligence" };

export default function Page() {
  return <Diligence />;
}
