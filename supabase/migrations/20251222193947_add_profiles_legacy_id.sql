alter table if exists public.profiles
  add column if not exists legacy_id text;

create index if not exists idx_profiles_legacy_id on public.profiles (legacy_id);
