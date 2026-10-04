import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { Providers } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Atrium",
    template: "%s · Atrium",
  },
  description:
    "A desk where NGOs turn a class-action folder into a pitch, and hedge funds and litigation funders diligence it.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
