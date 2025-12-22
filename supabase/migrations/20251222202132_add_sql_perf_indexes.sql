-- Performance indexes for SQL-only backend

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_user_configs_user_id on public.user_configs (user_id);
create index if not exists idx_playlists_owner_id on public.playlists (owner_id);
create index if not exists idx_playlists_legacy_id on public.playlists (legacy_id);

create index if not exists idx_media_items_owner_id on public.media_items (owner_id);
create index if not exists idx_media_items_legacy_id on public.media_items (legacy_id);

create index if not exists idx_ads_advertiser_id on public.ads (advertiser_id);
create index if not exists idx_ads_media_item_id on public.ads (media_item_id);
create index if not exists idx_ads_active on public.ads (active);

create index if not exists idx_client_advertisers_client_id on public.client_advertisers (client_id);
create index if not exists idx_client_advertisers_advertiser_id on public.client_advertisers (advertiser_id);

create index if not exists idx_activity_logs_created_at on public.activity_logs (created_at desc);
create index if not exists idx_player_status_last_seen on public.player_status (last_seen desc);
create index if not exists idx_jukebox_stats_daily_day on public.jukebox_stats_daily (day);
