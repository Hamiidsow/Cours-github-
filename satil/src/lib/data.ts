import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "./session";
import type { Row } from "./store";

/** Lecture d'une table de l'organisation courante. */
export function useTable(table: string, enabled = true) {
  const { store, org } = useSession();
  return useQuery({
    queryKey: ["t", org?.id, table],
    queryFn: () => store!.list(table),
    enabled: !!store && enabled,
  });
}
/** Lecture de plusieurs tables : { table: lignes }. */
export function useTables(tables: string[]) {
  const { store, org } = useSession();
  const qs = useQueries({
    queries: tables.map((table) => ({ queryKey: ["t", org?.id, table], queryFn: () => store!.list(table), enabled: !!store })),
  });
  const data: Record<string, Row[]> = {};
  tables.forEach((t, k) => { data[t] = qs[k].data ?? []; });
  return { data, loading: qs.some((q) => q.isLoading), error: qs.find((q) => q.error)?.error as Error | undefined };
}
export function useInvalidate() {
  const qc = useQueryClient();
  const { org } = useSession();
  return (table?: string) => qc.invalidateQueries({ queryKey: table ? ["t", org?.id, table] : ["t", org?.id] });
}
export function useSave(table: string) {
  const { store } = useSession();
  const inv = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, any> }) =>
      id ? store!.update(table, id, values) : (await store!.insert(table, [values]))[0],
    onSuccess: () => inv(table),
  });
}
