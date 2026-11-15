// Couche d'accès aux données. Deux implémentations derrière la même interface :
//  • SupabaseStore : PostgreSQL + RLS (mode normal, multi-utilisateurs, sécurisé).
//  • LocalStore    : stockage du navigateur (mode local, un seul poste, sans authentification).
// L'application ne parle jamais directement à l'une ou à l'autre.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Row = Record<string, any> & { id: string };
export interface AuditRow {
  id: number | string; table_name: string; row_id: string | null; action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, any> | null; new_data: Record<string, any> | null; at: string; user_id: string | null;
}
export interface Store {
  mode: "supabase" | "local";
  list(table: string): Promise<Row[]>;
  insert(table: string, rows: Record<string, any>[]): Promise<Row[]>;
  update(table: string, id: string, patch: Record<string, any>): Promise<Row>;
  remove(table: string, id: string): Promise<void>;
  audit(filter?: { table?: string; rowId?: string; limit?: number }): Promise<AuditRow[]>;
}

export class SupabaseStore implements Store {
  mode = "supabase" as const;
  constructor(private sb: SupabaseClient, private orgId: string) {}
  async list(table: string) {
    const { data, error } = await this.sb.from(table).select("*").eq("org_id", this.orgId)
      .order("created_at", { ascending: false }).limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []) as Row[];
  }
  async insert(table: string, rows: Record<string, any>[]) {
    const out: Row[] = [];
    for (let k = 0; k < rows.length; k += 500) {
      const { data, error } = await this.sb.from(table)
        .insert(rows.slice(k, k + 500).map((r) => ({ ...r, org_id: this.orgId }))).select();
      if (error) throw new Error(error.message);
      out.push(...((data ?? []) as Row[]));
    }
    return out;
  }
  async update(table: string, id: string, patch: Record<string, any>) {
    const { data, error } = await this.sb.from(table).update(patch).eq("id", id).select();
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error("Modification refusée : droits insuffisants ou ligne introuvable");
    return data[0] as Row;
  }
  async remove(table: string, id: string) {
    const { data, error } = await this.sb.from(table).delete().eq("id", id).select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error("Suppression refusée : droits insuffisants ou ligne introuvable");
  }
  async audit(filter: { table?: string; rowId?: string; limit?: number } = {}) {
    let q = this.sb.from("audit_logs").select("*").eq("org_id", this.orgId);
    if (filter.table) q = q.eq("table_name", filter.table);
    if (filter.rowId) q = q.eq("row_id", filter.rowId);
    const { data, error } = await q.order("at", { ascending: false }).limit(filter.limit ?? 300);
    if (error) throw new Error(error.message);
    return (data ?? []) as AuditRow[];
  }
}

const KEY = "satil.db.v1";
type Db = Record<string, any[]>;
const read = (): Db => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
const write = (db: Db) => {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch { throw new Error("Stockage du navigateur plein : exportez puis supprimez des données, ou passez au mode Supabase"); }
};

export class LocalStore implements Store {
  mode = "local" as const;
  private log(db: Db, table: string, action: AuditRow["action"], o: any, n: any) {
    const a = (db.audit_logs ??= []);
    a.unshift({ id: crypto.randomUUID(), table_name: table, row_id: (n ?? o).id, action, old_data: o, new_data: n, at: new Date().toISOString(), user_id: "local" });
    if (a.length > 3000) a.length = 3000;
  }
  async list(table: string) {
    return [...(read()[table] ?? [])].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  async insert(table: string, rows: Record<string, any>[]) {
    const db = read(); const t = (db[table] ??= []); const now = new Date().toISOString();
    const out = rows.map((r, k) => ({
      is_demo: false, ...r, id: crypto.randomUUID(), org_id: "local", created_by: "local",
      created_at: new Date(Date.now() + k).toISOString(), updated_at: now,
    }));
    out.forEach((r) => { t.push(r); this.log(db, table, "INSERT", null, r); });
    write(db);
    return out as Row[];
  }
  async update(table: string, id: string, patch: Record<string, any>) {
    const db = read(); const t = db[table] ?? []; const k = t.findIndex((r) => r.id === id);
    if (k < 0) throw new Error("Ligne introuvable");
    const old = t[k]; t[k] = { ...old, ...patch, id, org_id: old.org_id, created_at: old.created_at, updated_at: new Date().toISOString() };
    this.log(db, table, "UPDATE", old, t[k]); write(db);
    return t[k] as Row;
  }
  async remove(table: string, id: string) {
    const db = read(); const t = db[table] ?? []; const k = t.findIndex((r) => r.id === id);
    if (k < 0) throw new Error("Ligne introuvable");
    const [old] = t.splice(k, 1); this.log(db, table, "DELETE", old, null); write(db);
  }
  async audit(filter: { table?: string; rowId?: string; limit?: number } = {}) {
    return ((read().audit_logs ?? []) as AuditRow[])
      .filter((a) => (!filter.table || a.table_name === filter.table) && (!filter.rowId || a.row_id === filter.rowId))
      .slice(0, filter.limit ?? 300);
  }
  static exportAll(): string { return JSON.stringify(read(), null, 2); }
  static importAll(json: string) {
    const db = JSON.parse(json);
    if (!db || typeof db !== "object" || Array.isArray(db)) throw new Error("Fichier de sauvegarde invalide");
    write(db);
  }
  static isEmpty() { return Object.keys(read()).length === 0; }
}
