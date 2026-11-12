"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addImages, saveListing, submitForReview } from "@/app/actions/listings";
import {
  AMENITIES, AVAILABILITIES, CITIES, MAX_PHOTOS, NEIGHBORHOOD_SUGGESTIONS, PROPERTY_TYPES, TRANSACTIONS,
} from "@/lib/constants";
import { compressImage } from "@/lib/image";
import type { Dictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export type ListingFormValues = Partial<Record<
  | "type" | "city" | "neighborhood" | "address_private" | "title" | "description" | "transaction"
  | "fees_note" | "conditions" | "availability" | "available_from" | "contact_phone" | "contact_whatsapp",
  string | null
>> & Partial<Record<
  "surface_m2" | "rooms" | "bedrooms" | "bathrooms" | "price_fcfa" | "charges_fcfa" | "deposit_months" | "advance_months",
  number | null
>> & { furnished?: boolean; amenities?: string[] };

type Labels = Pick<Dictionary, "propertyTypes" | "transactions" | "availabilities" | "amenities"> & {
  // Textes déjà résolus côté serveur (les fonctions ne traversent pas la frontière client).
  f: Record<string, string>;
};

export function ListingForm({
  userId, listingId, initial = {}, existingCount = 0, labels,
}: { userId: string; listingId: string | null; initial?: ListingFormValues; existingCount?: number; labels: Labels }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [currentId, setCurrentId] = useState(listingId);
  const [photoCount, setPhotoCount] = useState(existingCount);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { f } = labels;
  const v = (k: keyof ListingFormValues) => (initial[k] ?? "") as string | number;

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const intent = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value ?? "draft";
    const fd = new FormData(e.currentTarget);
    const files = (fd.getAll("photos") as File[]).filter((x) => x.size > 0);
    fd.delete("photos");
    setError(null);

    if (photoCount + files.length > MAX_PHOTOS) return setError(`Maximum ${MAX_PHOTOS} photos par annonce.`);
    if (intent === "submit" && photoCount + files.length === 0) return setError(f.needPhoto);

    setBusy(true);
    try {
      // 1. Enregistrer le texte de l'annonce (validé côté serveur).
      setStatus(f.saving);
      const saved = await saveListing(currentId, fd);
      if ("error" in saved) return setError(saved.error);
      setCurrentId(saved.id);

      // 2. Compresser puis envoyer les photos, une par une.
      if (files.length) {
        const supabase = createClient();
        const paths: string[] = [];
        for (let i = 0; i < files.length; i++) {
          setStatus(f.uploading.replace("{i}", String(i + 1)).replace("{n}", String(files.length)));
          const blob = await compressImage(files[i]);
          const path = `${userId}/${saved.id}/${crypto.randomUUID()}.jpg`;
          const up = await supabase.storage.from("listing-images").upload(path, blob, { contentType: "image/jpeg" });
          if (up.error) return setError("L'envoi d'une photo a échoué. Vérifiez votre connexion puis réessayez.");
          paths.push(path);
        }
        const added = await addImages(saved.id, paths);
        if (added.error) return setError(added.error);
        setPhotoCount((n) => n + paths.length);
        if (fileRef.current) fileRef.current.value = "";
      }

      // 3. Soumettre à la validation si demandé.
      if (intent === "submit") {
        const sub = await submitForReview(saved.id);
        if (sub.error) return setError(sub.error);
      }
      router.push("/espace/annonces");
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Format de photo non pris en charge ou connexion interrompue.");
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  const num = (name: keyof ListingFormValues, label: string, max: number, required = false, hint?: string) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" inputMode="numeric" min={0} max={max} required={required}
        defaultValue={v(name)} className="input" />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );

  return (
    <form onSubmit={handle} className="grid gap-6">
      <fieldset className="card grid gap-4 p-5">
        <legend className="h2 px-1">{f.sectionProperty}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="type">{f.type}</label>
            <select id="type" name="type" required defaultValue={v("type")} className="input">
              {PROPERTY_TYPES.map((p) => <option key={p} value={p}>{labels.propertyTypes[p]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="city">{f.city}</label>
            <select id="city" name="city" required defaultValue={v("city") || "Dakar"} className="input">
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="neighborhood">{f.neighborhood}</label>
            <input id="neighborhood" name="neighborhood" required minLength={2} maxLength={80} list="quartiers-form"
              defaultValue={v("neighborhood")} className="input" />
            <datalist id="quartiers-form">{NEIGHBORHOOD_SUGGESTIONS.map((n) => <option key={n} value={n} />)}</datalist>
          </div>
          <div>
            <label className="label" htmlFor="address_private">{f.address}</label>
            <input id="address_private" name="address_private" maxLength={200} defaultValue={v("address_private")} className="input" />
            <p className="hint">{f.addressHint}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {num("surface_m2", f.surface, 1000000)}
          {num("rooms", f.rooms, 100)}
          {num("bedrooms", f.bedrooms, 100)}
          {num("bathrooms", f.bathrooms, 100)}
        </div>
        <div>
          <span className="label">{f.amenities}</span>
          <div className="flex flex-wrap gap-2">
            <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-sm has-checked:border-brand-700 has-checked:bg-brand-50">
              <input type="checkbox" name="furnished" defaultChecked={!!initial.furnished} className="accent-brand-900" /> {f.furnished}
            </label>
            {AMENITIES.map((a) => (
              <label key={a} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-sm has-checked:border-brand-700 has-checked:bg-brand-50">
                <input type="checkbox" name="amenities" value={a} defaultChecked={initial.amenities?.includes(a)} className="accent-brand-900" />
                {labels.amenities[a]}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="card grid gap-4 p-5">
        <legend className="h2 px-1">{f.sectionOffer}</legend>
        <div>
          <label className="label" htmlFor="title">{f.title}</label>
          <input id="title" name="title" required minLength={10} maxLength={120} placeholder={f.titlePh} defaultValue={v("title")} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">{f.description}</label>
          <textarea id="description" name="description" required minLength={30} maxLength={4000} rows={5} defaultValue={v("description")} className="input" />
          <p className="hint">{f.descriptionHint}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="transaction">{f.transaction}</label>
            <select id="transaction" name="transaction" defaultValue={v("transaction") || "location"} className="input">
              {TRANSACTIONS.map((x) => <option key={x} value={x}>{labels.transactions[x]}</option>)}
            </select>
          </div>
          {num("price_fcfa", f.price, 99999999999, true, f.priceHint)}
          {num("charges_fcfa", f.charges, 99999999999)}
          {num("deposit_months", f.deposit, 24)}
          {num("advance_months", f.advance, 24)}
          <div>
            <label className="label" htmlFor="availability">{f.availability}</label>
            <select id="availability" name="availability" defaultValue={v("availability") || "disponible"} className="input">
              {AVAILABILITIES.map((x) => <option key={x} value={x}>{labels.availabilities[x]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="available_from">{f.availableFrom}</label>
            <input id="available_from" name="available_from" type="date" defaultValue={v("available_from")} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="fees_note">{f.feesNote}</label>
            <input id="fees_note" name="fees_note" maxLength={500} defaultValue={v("fees_note")} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="conditions">{f.conditions}</label>
          <textarea id="conditions" name="conditions" maxLength={2000} rows={3} defaultValue={v("conditions")} className="input" />
        </div>
      </fieldset>

      <fieldset className="card grid gap-4 p-5 sm:grid-cols-2">
        <legend className="h2 px-1">{f.sectionContact}</legend>
        <div>
          <label className="label" htmlFor="contact_phone">{f.contactPhone}</label>
          <input id="contact_phone" name="contact_phone" type="tel" required placeholder="+221 77 123 45 67" defaultValue={v("contact_phone")} className="input" />
          <p className="hint">{f.contactHint}</p>
        </div>
        <div>
          <label className="label" htmlFor="contact_whatsapp">{f.contactWhatsapp}</label>
          <input id="contact_whatsapp" name="contact_whatsapp" type="tel" defaultValue={v("contact_whatsapp")} className="input" />
        </div>
      </fieldset>

      <fieldset className="card grid gap-3 p-5">
        <legend className="h2 px-1">{f.sectionPhotos}</legend>
        <input ref={fileRef} name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="input py-2" />
        <p className="hint">{f.photosHint} — {photoCount} / {MAX_PHOTOS}</p>
      </fieldset>

      <p className="rounded-lg bg-gold-50 p-3 text-sm text-gold-700">{f.moderationNote}</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {status && <p role="status" className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900">{status}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" name="intent" value="submit" className="btn-primary" disabled={busy}>{f.submit}</button>
        <button type="submit" name="intent" value="draft" className="btn-outline" disabled={busy}>{f.saveDraft}</button>
      </div>
    </form>
  );
}
