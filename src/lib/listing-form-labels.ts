import { MAX_PHOTOS } from "./constants";
import { getDictionary } from "./i18n";

// Prépare côté serveur les textes du formulaire d'annonce (composant client).
export function listingFormLabels() {
  const t = getDictionary();
  return {
    propertyTypes: t.propertyTypes, transactions: t.transactions,
    availabilities: t.availabilities, amenities: t.amenities,
    f: {
      sectionProperty: t.form.sectionProperty, sectionOffer: t.form.sectionOffer,
      sectionContact: t.form.sectionContact, sectionPhotos: t.form.sectionPhotos,
      type: t.search.type, city: t.search.city, neighborhood: t.search.neighborhood,
      address: t.form.address, addressHint: t.form.addressHint,
      surface: `${t.listing.surface} (m²)`, rooms: t.listing.rooms, bedrooms: t.listing.bedrooms,
      bathrooms: t.listing.bathrooms, amenities: t.listing.amenities, furnished: t.listing.furnished,
      title: t.form.title, titlePh: t.form.titlePh, description: t.form.description,
      descriptionHint: t.form.descriptionHint, transaction: t.search.transaction,
      price: t.form.price, priceHint: t.form.priceHint, charges: t.form.charges,
      deposit: t.form.deposit, advance: t.form.advance, availability: "Disponibilité",
      availableFrom: t.form.availableFrom, feesNote: t.form.feesNote, conditions: t.form.conditions,
      contactPhone: t.form.contactPhone, contactHint: t.form.contactHint,
      contactWhatsapp: t.form.contactWhatsapp, photosHint: t.form.photosHint(MAX_PHOTOS),
      moderationNote: t.form.moderationNote, submit: t.form.submit, saveDraft: t.form.saveDraft,
      saving: t.form.saving, uploading: "Envoi de la photo {i} sur {n}…", needPhoto: t.form.needPhoto,
    },
  };
}
