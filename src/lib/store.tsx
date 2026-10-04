"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { fundById } from "./funds";
import { library } from "./library";
import type { Delivery, Interest, Matter } from "./types";

const KEY = "atrium-v1";

type Persisted = {
  drafts: Matter[];
  interests: Interest[];
  deliveries: Delivery[];
  fundId: string;
};

const EMPTY: Persisted = { drafts: [], interests: [], deliveries: [], fundId: "northline" };

let memory: Persisted = EMPTY;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  memory = readPersisted();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return memory;
}

function getServerSnapshot() {
  return EMPTY;
}

function write(next: Persisted) {
  memory = next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

type Store = {
  drafts: Matter[];
  interests: Interest[];
  deliveries: Delivery[];
  fundId: string;
  fundName: string;
  book: Matter[];
  getMatter: (id: string) => Matter | undefined;
  setFundId: (id: string) => void;
  addDraft: (matter: Matter) => void;
  listMatter: (id: string) => void;
  sendToInvestors: (matterId: string, fundIds: string[]) => void;
  signalInterest: (matterId: string, note: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const persisted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<Store>(() => {
    const { drafts, interests, deliveries, fundId } = persisted;
    const book = [...library, ...drafts.filter((matter) => matter.shared)];
    return {
      drafts,
      interests,
      deliveries,
      fundId,
      fundName: fundById(fundId).name,
      book,
      getMatter: (id: string) =>
        drafts.find((matter) => matter.id === id) ??
        library.find((matter) => matter.id === id),
      setFundId: (id: string) => write({ ...getSnapshot(), fundId: id }),
      addDraft: (matter: Matter) => {
        const current = getSnapshot();
        write({
          ...current,
          drafts: [matter, ...current.drafts.filter((item) => item.id !== matter.id)],
        });
      },
      listMatter: (id: string) => {
        const current = getSnapshot();
        write({
          ...current,
          drafts: current.drafts.map((matter) =>
            matter.id === id ? { ...matter, shared: true } : matter,
          ),
        });
      },
      sendToInvestors: (matterId: string, fundIds: string[]) => {
        const current = getSnapshot();
        const at = new Date().toISOString();
        const ids = [...new Set(fundIds)].slice(0, 6);
        const added: Delivery[] = ids.map((fundId) => ({
          id: `${matterId}-${fundId}`,
          matterId,
          fundId,
          at,
        }));
        write({
          ...current,
          drafts: current.drafts.map((matter) =>
            matter.id === matterId ? { ...matter, shared: true } : matter,
          ),
          deliveries: [
            ...added,
            ...current.deliveries.filter(
              (item) => item.matterId !== matterId || !ids.includes(item.fundId),
            ),
          ],
        });
      },
      signalInterest: (matterId: string, note: string) => {
        const current = getSnapshot();
        const rest = current.interests.filter(
          (item) => !(item.matterId === matterId && item.fundId === current.fundId),
        );
        write({
          ...current,
          interests: [
            {
              id: `${matterId}-${current.fundId}-${Date.now()}`,
              matterId,
              fundId: current.fundId,
              note,
              at: new Date().toISOString(),
            },
            ...rest,
          ],
        });
      },
    };
  }, [persisted]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside Providers");
  const ready = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return { ...store, ready };
}

function subscribeNothing() {
  return () => {};
}

function readPersisted(): Persisted {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
      interests: Array.isArray(parsed.interests) ? parsed.interests : [],
      deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : [],
      fundId: typeof parsed.fundId === "string" ? parsed.fundId : "northline",
    };
  } catch {
    return EMPTY;
  }
}
