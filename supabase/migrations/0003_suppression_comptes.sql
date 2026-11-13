-- =====================================================================
-- SamaKeur — permettre la suppression d'un compte administrateur.
-- Les décisions qu'il a prises restent en base ; seule la référence à
-- son compte est vidée.
-- =====================================================================
alter table public.owner_verifications
  drop constraint owner_verifications_reviewed_by_fkey,
  add constraint owner_verifications_reviewed_by_fkey
    foreign key (reviewed_by) references public.profiles (id) on delete set null;

alter table public.reports
  drop constraint reports_resolved_by_fkey,
  add constraint reports_resolved_by_fkey
    foreign key (resolved_by) references public.profiles (id) on delete set null;
