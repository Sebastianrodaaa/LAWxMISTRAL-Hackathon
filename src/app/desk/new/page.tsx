import type { Metadata } from "next";
import { NewMatter } from "@/components/new-matter";

export const metadata: Metadata = { title: "New folder" };

export default function Page() {
  return <NewMatter />;
}
