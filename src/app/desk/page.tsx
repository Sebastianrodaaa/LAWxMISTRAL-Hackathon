import type { Metadata } from "next";
import { DeskHome } from "@/components/desk-home";

export const metadata: Metadata = { title: "Desk" };

export default function Page() {
  return <DeskHome />;
}
