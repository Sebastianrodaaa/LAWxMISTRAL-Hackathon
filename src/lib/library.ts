import { buildMatter } from "./build";
import { mercyFiles, nightshiftFiles, riverbendFiles } from "./dockets";
import type { Matter } from "./types";

export const library: Matter[] = [
  buildMatter(riverbendFiles, {
    id: "riverbend",
    origin: "library",
    shared: true,
  }),
  buildMatter(nightshiftFiles, {
    id: "nightshift",
    origin: "library",
    shared: true,
  }),
  buildMatter(mercyFiles, {
    id: "mercy",
    origin: "library",
    shared: true,
  }),
];

export function libraryMatter(id: string) {
  return library.find((matter) => matter.id === id);
}
