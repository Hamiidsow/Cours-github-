import type { Metadata } from "next";
import Link from "next/link";
import { moderateListing, resolveReport, reviewVerification, setAccountStatus } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { StatusBadge, VerifiedBadge } from "@/components/Badges";
import { ListingImage } from "@/components/ListingImage";
import { requireAdmin } from "@/lib/auth";
import type { ListingStatus, PropertyType, Role } from "@/lib/constants";
import { escapeLike, formatDate, formatFcfa } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = ["annonces", "verifications", "signalements", "comptes", "journal"] as const;
type Tab = (typeof TABS)[number];

function NoteField({ id }: { id: string }) {
  const t = getDictionary();
  return (
    <div>
      <label className="label" htmlFor={id}>{t.admin.note}</label>
      <input id={id} name="note" maxLength={500} className="input" />
    </div>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ onglet?: string; q?: string }> }) {
  const t = getDictionary();
  await requireAdmin();
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.onglet ?? "") ? (sp.onglet as Tab) : "annonces";
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };

  const [cListings, cVerifs, cReports] = await Promise.all([
    supabase.from("listings").select("id", head).eq("status", "en_attente"),
    supabase.from("owner_verifications").select("id", head).eq("status", "en_attente"),
    supabase.from("reports").select("id", head).eq("status", "ouvert"),
  ]);
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "annonces", label: t.admin.tabListings, count: cListings.count ?? 0 },
    { key: "verifications", label: t.admin.tabVerifications, count: cVerifs.count ?? 0 },
    { key: "signalements", label: t.admin.tabReports, count: cReports.count ?? 0 },
    { key: "comptes", label: t.admin.tabAccounts },
    { key: "journal", label: t.admin.tabLogs },
  ];

  return (
    <div className="container-page py-6">
      <h1 className="h1">{t.admin.title}</h1>
      <nav aria-label="Sections d'administration" className="-mx-4 mt-4 flex gap-1 overflow-x-auto border-b border-line px-4 pb-2 sm:mx-0 sm:px-0">
        {tabs.map((x) => (
          <Link key={x.key} href={`/admin?onglet=${x.key}`} aria-current={tab === x.key ? "page" : undefined}
            className={`btn shrink-0 whitespace-nowrap ${tab === x.key ? "bg-brand-900 text-white" : "text-brand-900 hover:bg-brand-50"}`}>
            {x.label}
            {x.count ? <span className="badge bg-gold-500 text-brand-950">{x.count}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        {tab === "annonces" && <PendingListings />}
        {tab === "verifications" && <PendingVerifications />}
        {tab === "signalements" && <OpenReports />}
        {tab === "comptes" && <Accounts q={sp.q} />}
        {tab === "journal" && <Logs />}
      </div>
    </div>
  );
}

async function PendingListings() {
  const t = getDictionary();
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("id, title, description, transaction, price_fcfa, charges_fcfa, deposit_months, advance_months, conditions, contact_phone, created_at, owner_id, properties(type, city, neighborhood, address_private, surface_m2, bedrooms), listing_images(storage_path, position), profiles(display_name, role, verification_status)")
    .eq("status", "en_attente")
    .order("created_at", { ascending: true })
    .limit(30);
  type Row = {
    id: string; title: string; description: string; transaction: "location" | "vente"; price_fcfa: number;
    charges_fcfa: number | null; deposit_months: number | null; advance_months: number | null; conditions: string | null;
    contact_phone: string; created_at: string; owner_id: string;
    properties: { type: PropertyType; city: string; neighborhood: string; address_private: string | null; surface_m2: number | null; bedrooms: number | null } | null;
    listing_images: { storage_path: string; position: number }[];
    profiles: { display_name: string; role: Role; verification_status: string } | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return <p className="card p-6 text-muted">{t.admin.empty}</p>;
  return (
    <ul className="grid gap-4">
      {rows.map((l) => (
        <li key={l.id} className="card grid gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{formatDate(l.created_at)}</span>·
            <span>{l.profiles?.display_name} ({l.profiles && t.roles[l.profiles.role]})</span>
            <VerifiedBadge verified={l.profiles?.verification_status === "verifie"} />
          </div>
          <h2 className="font-semibold text-brand-950">{l.title}</h2>
          <p className="text-sm">
            {l.properties && `${t.propertyTypes[l.properties.type]} · ${l.properties.neighborhood}, ${l.properties.city}`} ·{" "}
            {t.transactions[l.transaction]} · <strong>{formatFcfa(l.price_fcfa)}</strong>
            {l.deposit_months != null && ` · caution ${l.deposit_months} mois`}
            {l.advance_months != null && ` · avance ${l.advance_months} mois`}
          </p>
          <p className="text-sm text-muted">
            Adresse privée : {l.properties?.address_private ?? "non renseignée"} · Contact : {l.contact_phone}
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {[...l.listing_images].sort((a, b) => a.position - b.position).map((i) => (
              <ListingImage key={i.storage_path} path={i.storage_path} alt="" className="h-28 w-36 shrink-0 rounded-lg" />
            ))}
          </div>
          <p className="whitespace-pre-line text-sm text-ink/90">{l.description}</p>
          {l.conditions && <p className="text-sm text-muted">Conditions : {l.conditions}</p>}
          <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
            <ActionForm action={moderateListing.bind(null, l.id, "publiee")} submitLabel={t.admin.approve} className="grid content-start gap-2" />
            <ActionForm action={moderateListing.bind(null, l.id, "rejetee")} submitLabel={t.admin.reject} submitClass="btn-danger" className="grid gap-2">
              <NoteField id={`n-${l.id}`} />
            </ActionForm>
          </div>
        </li>
      ))}
    </ul>
  );
}

async function PendingVerifications() {
  const t = getDictionary();
  const supabase = await createClient();
  const { data } = await supabase
    .from("owner_verifications")
    .select("id, user_id, document_type, document_path, created_at, profiles!owner_verifications_user_id_fkey(display_name, role)")
    .eq("status", "en_attente")
    .order("created_at", { ascending: true })
    .limit(30);
  type Row = { id: string; user_id: string; document_type: keyof typeof t.documentTypes; document_path: string; created_at: string; profiles: { display_name: string; role: Role } | null };
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return <p className="card p-6 text-muted">{t.admin.empty}</p>;
  // Liens temporaires (10 minutes) vers le bucket privé, générés pour l'admin.
  const signed = await Promise.all(
    rows.map((r) => supabase.storage.from("identity-documents").createSignedUrl(r.document_path, 600)),
  );
  return (
    <ul className="grid gap-4">
      {rows.map((v, i) => (
        <li key={v.id} className="card grid gap-3 p-4">
          <p className="font-semibold text-brand-950">{v.profiles?.display_name} — {v.profiles && t.roles[v.profiles.role]}</p>
          <p className="text-sm text-muted">{t.documentTypes[v.document_type]} · {formatDate(v.created_at)}</p>
          {signed[i].data?.signedUrl ? (
            <a href={signed[i].data!.signedUrl} target="_blank" rel="noopener noreferrer" className="btn-outline justify-self-start">{t.admin.viewDoc}</a>
          ) : (
            <p className="text-sm text-red-800">Document inaccessible.</p>
          )}
          <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
            <ActionForm action={reviewVerification.bind(null, v.id, true)} submitLabel={t.admin.approveVerif} className="grid content-start gap-2"
              confirm="Confirmez-vous avoir contrôlé ce document ? Le compte portera le badge « Vérifié »." />
            <ActionForm action={reviewVerification.bind(null, v.id, false)} submitLabel={t.admin.rejectVerif} submitClass="btn-danger" className="grid gap-2">
              <NoteField id={`v-${v.id}`} />
            </ActionForm>
          </div>
        </li>
      ))}
    </ul>
  );
}

async function OpenReports() {
  const t = getDictionary();
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, reason, details, created_at, listing_id, listings(title, status, owner_id), reporter:profiles!reports_reporter_id_fkey(display_name)")
    .eq("status", "ouvert")
    .order("created_at", { ascending: true })
    .limit(30);
  type Row = { id: string; reason: keyof typeof t.reportReasons; details: string | null; created_at: string; listing_id: string;
    listings: { title: string; status: ListingStatus; owner_id: string } | null; reporter: { display_name: string } | null };
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return <p className="card p-6 text-muted">{t.admin.empty}</p>;
  return (
    <ul className="grid gap-4">
      {rows.map((r) => (
        <li key={r.id} className="card grid gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-red-100 text-red-800">{t.reportReasons[r.reason]}</span>
            {r.listings && <StatusBadge status={r.listings.status} />}
            <span className="text-sm text-muted">{formatDate(r.created_at)} · par {r.reporter?.display_name}</span>
          </div>
          <p className="font-semibold text-brand-950">
            {r.listings?.status === "publiee"
              ? <Link href={`/annonces/${r.listing_id}`} className="underline">{r.listings.title}</Link>
              : r.listings?.title}
          </p>
          {r.details && <p className="text-sm">« {r.details} »</p>}
          <div className="grid gap-3 border-t border-line pt-3 lg:grid-cols-2">
            <ActionForm action={moderateListing.bind(null, r.listing_id, "suspendue")} submitLabel={t.admin.suspendListing} submitClass="btn-danger" className="grid gap-2">
              <NoteField id={`rl-${r.id}`} />
            </ActionForm>
            {r.listings && (
              <ActionForm action={setAccountStatus.bind(null, r.listings.owner_id, "suspendu")} submitLabel={t.admin.suspendAccount} submitClass="btn-danger" className="grid gap-2"
                confirm="Suspendre ce compte ? Toutes ses annonces seront retirées du site.">
                <NoteField id={`ra-${r.id}`} />
              </ActionForm>
            )}
            <ActionForm action={resolveReport.bind(null, r.id, "traite")} submitLabel={t.admin.markHandled} submitClass="btn-outline" className="grid gap-2" />
            <ActionForm action={resolveReport.bind(null, r.id, "rejete")} submitLabel={t.admin.dismiss} submitClass="btn-ghost" className="grid gap-2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function Accounts({ q }: { q?: string }) {
  const t = getDictionary();
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, display_name, role, account_status, verification_status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (q?.trim()) query = query.ilike("display_name", `%${escapeLike(q.trim().slice(0, 80))}%`);
  const { data } = await query;
  return (
    <>
      <form method="get" action="/admin" className="flex max-w-md gap-2">
        <input type="hidden" name="onglet" value="comptes" />
        <label className="sr-only" htmlFor="q">Rechercher un nom</label>
        <input id="q" name="q" defaultValue={q ?? ""} placeholder="Rechercher un nom" className="input" />
        <button type="submit" className="btn-outline">{t.search.submit}</button>
      </form>
      <ul className="mt-4 grid gap-3">
        {(data ?? []).map((p) => (
          <li key={p.id} className="card grid gap-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-brand-950">{p.display_name}</strong>
              <span className="badge bg-brand-50 text-brand-900">{t.roles[p.role as Role]}</span>
              <VerifiedBadge verified={p.verification_status === "verifie"} />
              {p.account_status === "suspendu" && <span className="badge bg-red-100 text-red-800">Suspendu</span>}
              <span className="text-xs text-muted">{formatDate(p.created_at)}</span>
            </div>
            {p.role !== "admin" && (
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-brand-700">
                  {p.account_status === "actif" ? t.admin.suspend : t.admin.reactivate}
                </summary>
                <ActionForm
                  action={setAccountStatus.bind(null, p.id, p.account_status === "actif" ? "suspendu" : "actif")}
                  submitLabel={p.account_status === "actif" ? t.admin.suspendAccount : t.admin.reactivate}
                  submitClass={p.account_status === "actif" ? "btn-danger" : "btn-primary"} className="mt-2 grid max-w-md gap-2">
                  <NoteField id={`a-${p.id}`} />
                </ActionForm>
              </details>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

async function Logs() {
  const t = getDictionary();
  const supabase = await createClient();
  const { data } = await supabase
    .from("moderation_logs")
    .select("id, action, target_type, target_id, note, created_at, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  type Row = { id: number; action: string; target_type: string; target_id: string; note: string | null; created_at: string; profiles: { display_name: string } | null };
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return <p className="card p-6 text-muted">{t.admin.empty}</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-brand-50 text-brand-900">
          <tr><th className="p-3">Date</th><th className="p-3">Administrateur</th><th className="p-3">Action</th><th className="p-3">Cible</th><th className="p-3">Motif</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-line align-top">
              <td className="whitespace-nowrap p-3">{new Date(r.created_at).toLocaleString("fr-FR", { timeZone: "Africa/Dakar" })}</td>
              <td className="p-3">{r.profiles?.display_name ?? "—"}</td>
              <td className="p-3 font-medium">{r.action}</td>
              <td className="p-3 font-mono text-xs">{r.target_type} {r.target_id.slice(0, 8)}</td>
              <td className="p-3">{r.note ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
