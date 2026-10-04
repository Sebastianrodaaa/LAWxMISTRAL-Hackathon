import type { Metadata } from "next";
import type { ReactNode } from "react";
import { EB_Garamond, IBM_Plex_Mono, Lato } from "next/font/google";
import { Shell } from "@/components/shell";
import { Providers } from "@/lib/store";
import "./globals.css";

const sans = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
});

const serif = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-eb",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
});

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
      className={`${sans.variable} ${serif.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
