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
import type { Interest, Matter } from "./types";

const KEY = "atrium-v1";

type Persisted = {
  drafts: Matter[];
  interests: Interest[];
  fundId: string;
};

const EMPTY: Persisted = { drafts: [], interests: [], fundId: "northline" };

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
  fundId: string;
  fundName: string;
  book: Matter[];
  getMatter: (id: string) => Matter | undefined;
  setFundId: (id: string) => void;
  addDraft: (matter: Matter) => void;
  listMatter: (id: string) => void;
  signalInterest: (matterId: string, note: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const persisted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<Store>(() => {
    const { drafts, interests, fundId } = persisted;
    const book = [...library, ...drafts.filter((matter) => matter.shared)];
    return {
      drafts,
      interests,
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
      fundId: typeof parsed.fundId === "string" ? parsed.fundId : "northline",
    };
  } catch {
    return EMPTY;
  }
}
