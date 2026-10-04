import type { Metadata } from "next";
import { DealBook } from "@/components/deal-book";

export const metadata: Metadata = { title: "The book" };

export default function Page() {
  return <DealBook />;
}
