-- =====================================================================
-- SamaKeur — règles sur les photos, appliquées par la base (et plus
-- seulement par le serveur web) afin qu'une future application mobile
-- hérite des mêmes garanties.
-- =====================================================================

-- 8 photos maximum par annonce.
create function public.listing_images_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.listing_images i where i.listing_id = new.listing_id) >= 8 then
    raise exception 'Maximum 8 photos par annonce.';
  end if;
  return new;
end $$;

create trigger listing_images_limit_trg before insert on public.listing_images
  for each row execute function public.listing_images_limit();

-- Une annonce ne peut être soumise à validation qu'avec au moins une photo.
-- (S'exécute après listings_guard_trg : ordre alphabétique des triggers.)
create function public.listings_require_photo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or public.is_admin() then
    return new;
  end if;
  if new.status = 'en_attente' and (tg_op = 'INSERT' or old.status is distinct from 'en_attente')
     and not exists (select 1 from public.listing_images i where i.listing_id = new.id) then
    raise exception 'Ajoutez au moins une photo avant de soumettre l''annonce.';
  end if;
  return new;
end $$;

create trigger listings_require_photo_trg before insert or update on public.listings
  for each row execute function public.listings_require_photo();

revoke execute on function public.listing_images_limit() from public, anon, authenticated;
revoke execute on function public.listings_require_photo() from public, anon, authenticated;
