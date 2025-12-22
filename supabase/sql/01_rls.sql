-- RLS policies for the parallel SQL schema

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt()->'user_metadata'->>'role', 'user');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'admin';
$$;

alter table public.profiles enable row level security;
alter table public.user_configs enable row level security;
alter table public.global_config enable row level security;
alter table public.media_items enable row level security;
alter table public.playlists enable row level security;
alter table public.ads enable row level security;
alter table public.client_advertisers enable row level security;
alter table public.activity_logs enable row level security;
alter table public.player_status enable row level security;
alter table public.ad_impressions enable row level security;
alter table public.jukebox_requests enable row level security;
alter table public.jukebox_stats_daily enable row level security;
alter table public.system_stats enable row level security;

-- profiles
create policy profiles_select_self on public.profiles
  for select using (auth.uid() = id);

create policy profiles_insert_self on public.profiles
  for insert with check (auth.uid() = id);

create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_admin_all on public.profiles
  for all using (public.is_admin())
  with check (public.is_admin());

-- user_configs
create policy user_configs_select_self on public.user_configs
  for select using (auth.uid() = user_id or public.is_admin());

create policy user_configs_write_self on public.user_configs
  for insert with check (auth.uid() = user_id or public.is_admin());

create policy user_configs_update_self on public.user_configs
  for update using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- global_config (admin only)
create policy global_config_admin_select on public.global_config
  for select using (public.is_admin());

create policy global_config_admin_write on public.global_config
  for insert with check (public.is_admin());

create policy global_config_admin_update on public.global_config
  for update using (public.is_admin())
  with check (public.is_admin());

create policy global_config_admin_delete on public.global_config
  for delete using (public.is_admin());

-- media_items
create policy media_items_select_owner on public.media_items
  for select using (auth.uid() = owner_id or public.is_admin());

create policy media_items_insert_owner on public.media_items
  for insert with check (auth.uid() = owner_id or public.is_admin());

create policy media_items_update_owner on public.media_items
  for update using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());

create policy media_items_delete_owner on public.media_items
  for delete using (auth.uid() = owner_id or public.is_admin());

-- playlists
create policy playlists_select_owner on public.playlists
  for select using (auth.uid() = owner_id or public.is_admin());

create policy playlists_insert_owner on public.playlists
  for insert with check (auth.uid() = owner_id or public.is_admin());

create policy playlists_update_owner on public.playlists
  for update using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());

create policy playlists_delete_owner on public.playlists
  for delete using (auth.uid() = owner_id or public.is_admin());

-- ads
create policy ads_select_owner on public.ads
  for select using (auth.uid() = advertiser_id or public.is_admin());

create policy ads_insert_owner on public.ads
  for insert with check (auth.uid() = advertiser_id or public.is_admin());

create policy ads_update_owner on public.ads
  for update using (auth.uid() = advertiser_id or public.is_admin())
  with check (auth.uid() = advertiser_id or public.is_admin());

create policy ads_delete_owner on public.ads
  for delete using (auth.uid() = advertiser_id or public.is_admin());

-- client_advertisers
create policy client_advertisers_select_parties on public.client_advertisers
  for select using (
    auth.uid() = client_id
    or auth.uid() = advertiser_id
    or public.is_admin()
  );

create policy client_advertisers_admin_write on public.client_advertisers
  for insert with check (public.is_admin());

create policy client_advertisers_admin_update on public.client_advertisers
  for update using (public.is_admin())
  with check (public.is_admin());

create policy client_advertisers_admin_delete on public.client_advertisers
  for delete using (public.is_admin());

-- activity_logs (admin only)
create policy activity_logs_admin_select on public.activity_logs
  for select using (public.is_admin());

create policy activity_logs_admin_insert on public.activity_logs
  for insert with check (public.is_admin());

-- player_status
create policy player_status_admin_select on public.player_status
  for select using (public.is_admin() or auth.uid() = user_id);

create policy player_status_write_self on public.player_status
  for insert with check (auth.uid() = user_id or public.is_admin());

create policy player_status_update_self on public.player_status
  for update using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- ad_impressions (admin only)
create policy ad_impressions_admin_select on public.ad_impressions
  for select using (public.is_admin());

create policy ad_impressions_admin_insert on public.ad_impressions
  for insert with check (public.is_admin());

-- jukebox_requests
create policy jukebox_requests_admin_select on public.jukebox_requests
  for select using (public.is_admin());

create policy jukebox_requests_insert_auth on public.jukebox_requests
  for insert with check (auth.uid() is not null or public.is_admin());

-- jukebox_stats_daily (admin only)
create policy jukebox_stats_daily_admin_select on public.jukebox_stats_daily
  for select using (public.is_admin());

create policy jukebox_stats_daily_admin_write on public.jukebox_stats_daily
  for insert with check (public.is_admin());

create policy jukebox_stats_daily_admin_update on public.jukebox_stats_daily
  for update using (public.is_admin())
  with check (public.is_admin());

-- system_stats (admin only)
create policy system_stats_admin_select on public.system_stats
  for select using (public.is_admin());

create policy system_stats_admin_write on public.system_stats
  for insert with check (public.is_admin());

create policy system_stats_admin_update on public.system_stats
  for update using (public.is_admin())
  with check (public.is_admin());
