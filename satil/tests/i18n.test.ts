import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { DICT } from "@/lib/dict";
import { INDICATORS, RESOURCES } from "@/resources";
import { ROLES } from "@/lib/permissions";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

describe("traductions FR / EN / ZH", () => {
  it("chaque entrée est remplie dans les trois langues", () => {
    const bad = Object.entries(DICT).filter(([, e]) => e.length !== 3 || e.some((s) => !s.trim())).map(([k]) => k);
    expect(bad).toEqual([]);
  });
  it("toutes les clés littérales utilisées dans le code existent", () => {
    const used = new Set<string>();
    for (const f of files(path.resolve(__dirname, "../src"))) {
      for (const m of readFileSync(f, "utf8").matchAll(/\bt\(\s*"([a-zA-Z0-9_.]+)"\s*[,)]/g)) used.add(m[1]);
      for (const m of readFileSync(f, "utf8").matchAll(/\b(?:k|key|group|to|label):\s*"((?:nav|t|sim|auth|road|sec)\.[a-zA-Z0-9_.]+)"/g)) used.add(m[1]);
    }
    const missing = [...used].filter((k) => !k.endsWith(".") && k.includes(".") && !DICT[k]);
    expect(missing).toEqual([]);
  });
  it("champs, options, tables, indicateurs et rôles sont tous traduits", () => {
    const need = new Set<string>();
    for (const r of Object.values(RESOURCES)) {
      need.add("t." + r.table); need.add("d." + r.table);
      for (const f of r.fields) {
        need.add("f." + f.key);
        if (f.type === "sel" && !f.raw) f.options!.forEach((o) => need.add("o." + o));
      }
    }
    INDICATORS.forEach((i) => need.add("ind." + i.code));
    ROLES.forEach((r) => need.add("role." + r));
    expect([...need].filter((k) => !DICT[k])).toEqual([]);
  });
});
