import type { Metadata } from "next";
import { InvestorDashboard } from "@/components/investor-dashboard";

export const metadata: Metadata = { title: "Investor desk" };

export default function Page() {
  return <InvestorDashboard />;
}
