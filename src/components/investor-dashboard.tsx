"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Library, Sparkles } from "lucide-react";
import { DealBook } from "@/components/deal-book";
import { InvestorChat } from "@/components/investor-chat";
import { SidebarWithTabs, useTabs, type NavItem } from "@/components/sidebar-with-tabs";

const navItems: NavItem[] = [
  { id: "pitches", label: "Pitches", icon: Library },
  { id: "ai", label: "AI", icon: Sparkles },
];

function investorNav(id: string) {
  if (id === "analyst" || id === "research") return "ai";
  return id;
}

function NavBridge({ bind }: { bind: (go: (navId: string) => void) => void }) {
  const { setActiveNav } = useTabs();
  bind(setActiveNav);
  return null;
}

export function InvestorDashboard({ entryNav, matterId: entryMatter }: { entryNav?: string; matterId?: string }) {
  const [matterId, setMatterId] = useState(entryMatter ?? "");
  const go = useRef<(navId: string) => void>(() => {});

  return (
    <SidebarWithTabs
      companyName="Atrium"
      storageKey="atrium-investor-tabs"
      navItems={navItems}
      mapNavId={investorNav}
      entryNav={entryNav ? investorNav(entryNav) : undefined}
      defaultNavId="pitches"
      renderContent={(navId) => (
        <>
          <NavBridge bind={(fn) => { go.current = fn; }} />
          {navId === "pitches" ? (
            <DealBook
              onOpen={(id) => {
                setMatterId(id);
                go.current("ai");
              }}
            />
          ) : null}
          {navId === "ai" ? <InvestorChat matterId={matterId} onMatter={setMatterId} /> : null}
        </>
      )}
      footer={
        <div className="min-w-0">
          <p className="text-xs text-faint">Investor desk</p>
          <Link href="/desk" className="text-sm font-medium text-gold">
            NGO dashboard
          </Link>
        </div>
      }
    />
  );
}
