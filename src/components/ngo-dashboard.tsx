"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bot, FolderPlus, Landmark, ShieldAlert } from "lucide-react";
import { CapitalDirectory } from "@/components/capital-directory";
import { CaseView } from "@/components/case-view";
import { NewMatter } from "@/components/new-matter";
import { NgoAgent } from "@/components/ngo-agent";
import { SanctionsFeed } from "@/components/sanctions-feed";
import { SidebarWithTabs, useTabs, type NavItem } from "@/components/sidebar-with-tabs";
import type { Sanction } from "@/lib/types";

const navItems: NavItem[] = [
  { id: "pitches", label: "Sanctions", icon: ShieldAlert },
  { id: "generate", label: "Generate", icon: FolderPlus },
  { id: "investors", label: "Investors", icon: Landmark },
  { id: "agent", label: "Agent", icon: Bot },
];

function NavBridge({ bind }: { bind: (go: (navId: string) => void) => void }) {
  const { setActiveNav } = useTabs();
  bind(setActiveNav);
  return null;
}

export function NgoDashboard({ entryNav, matterId: entryMatter }: { entryNav?: string; matterId?: string }) {
  const [matterId, setMatterId] = useState(entryMatter ?? "");
  const [showCase, setShowCase] = useState(Boolean(entryMatter));
  const [sanction, setSanction] = useState<Sanction | null>(null);
  const [developNonce, setDevelopNonce] = useState(0);
  const go = useRef<(navId: string) => void>(() => {});

  return (
    <SidebarWithTabs
      companyName="Atrium"
      storageKey="atrium-ngo-tabs"
      navItems={navItems}
      entryNav={entryNav}
      defaultNavId="pitches"
      renderContent={(navId) => (
        <>
          <NavBridge bind={(fn) => { go.current = fn; }} />
          {navId === "generate" ? <NewMatter sanction={sanction} nonce={developNonce} /> : null}
          {navId === "investors" ? <CapitalDirectory /> : null}
          {navId === "agent" ? <NgoAgent matterId={matterId || undefined} onMatter={setMatterId} /> : null}
          {navId === "pitches" && showCase && matterId ? (
            <CaseView matterId={matterId} onBack={() => setShowCase(false)} onInvestors={() => go.current("investors")} />
          ) : null}
          {navId === "pitches" && !(showCase && matterId) ? (
            <SanctionsFeed
              onDiscuss={() => go.current("agent")}
              onDevelop={(item) => {
                setSanction(item);
                setDevelopNonce((value) => value + 1);
                go.current("generate");
              }}
            />
          ) : null}
        </>
      )}
      footer={
        <div className="min-w-0">
          <p className="text-xs text-faint">NGO desk</p>
          <Link href="/book" className="text-sm font-medium text-gold">
            Investor dashboard
          </Link>
        </div>
      }
    />
  );
}
