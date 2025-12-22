-- Deduplicate legacy_id rows keeping the richest playlist, then enforce uniqueness.
with ranked as (
  select
    id,
    legacy_id,
    row_number() over (
      partition by legacy_id
      order by
        case when jsonb_typeof(items) = 'array' then jsonb_array_length(items) else 0 end desc,
        updated_at desc nulls last,
        created_at desc nulls last,
        id
    ) as rn
  from public.playlists
  where legacy_id is not null
)
delete from public.playlists p
using ranked r
where p.id = r.id
  and r.rn > 1;

create unique index if not exists idx_playlists_legacy_id_unique
on public.playlists (legacy_id)
where legacy_id is not null;
