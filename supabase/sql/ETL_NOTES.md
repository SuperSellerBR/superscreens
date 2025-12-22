# KV -> SQL migration notes (parallel)

Este guia descreve um ETL incremental para migrar dados do KV para o SQL sem desligar o KV/Edge atual.

## KV keys e destino sugerido

- `users_list`
  - Destino: `public.profiles`
  - Campos: `id`, `email`, `role`, `nome_fantasia`, `razao_social`, `logo_path`, `logo_url`, `status`, `created_at`
  - Observacao: manter `user_metadata.role` em Auth sincronizado com `profiles.role`.

- `media_library`
  - Destino: `public.media_items`
  - Campos: `id`, `owner_id`, `title`, `url`, `path`, `type`, `duration`, `layout`, `metadata`, `created_at`
  - Observacao: `ownerId` do KV vira `owner_id`. Itens legados sem owner podem ficar `owner_id` NULL (opcional) ou ser atribuídos ao admin.

- `playlists_index`
  - Destino: `public.playlists` (metadados)
  - Campos: `id`, `owner_id`, `name`, `created_at`, `updated_at`
  - Observacao: o KV index nao guarda `items` nem `settings`.

- `playlist_data_{id}`
  - Destino: `public.playlists.items` e `public.playlists.settings`
  - Observacao: alguns registros sao arrays (formato legado). Para eles, use `items` = array e `settings.shuffle` = false.

- `active_playlist_{userId}`
  - Destino: opcional (deprecado). Pode ser importado para `public.playlists` como playlist ativa do usuario (name: "Active"), se quiser preservar.

- `active_playlist_settings_{userId}`
  - Destino: `public.playlists.settings` da playlist ativa (ou `public.user_configs` se preferir).

- `advertisers`
  - Destino recomendado: `public.media_items` + `public.ads` + `public.profiles` com role=advertiser
  - Observacao: se preferir manter legado, crie uma tabela auxiliar de legado. Nesta migracao, o foco e normalizar.

- `client_ads_{clientId}`
  - Destino: `public.client_advertisers` (relacao N:N)

- `news_rss_url_{userId}`
  - Destino: `public.user_configs.news_rss_url`

- `config_logo_url_{userId}`
  - Destino: `public.user_configs.logo_url`

- `active_template_{userId}`
  - Destino: `public.user_configs.active_template`

- `config_cycle_ratio_{userId}`
  - Destino: `public.user_configs.cycle_ratio`

- `youtube_api_key`
  - Destino: `public.global_config` (key: "youtube_api_key")

- `activity_log`
  - Destino: `public.activity_logs`
  - Observacao: KV usa `{ text, type, time }`. Mapear para `message`, `type`, `created_at`.

- `player_status_{uid}`
  - Destino: `public.player_status`
  - Observacao: armazenar `last_seen`, `current_media`, `is_online`.

- `stats_total_impressions`
  - Destino: `public.system_stats` (key: "stats_total_impressions") ou derivar de `public.ad_impressions`.

- `stats_jukebox_requests`
  - Destino: `public.system_stats` (key: "stats_jukebox_requests") ou derivar de `public.jukebox_requests`.

- `stats_jukebox_daily` / `stats_jukebox_daily_backup`
  - Destino: `public.jukebox_stats_daily` (day, count).

## Estrategia incremental (sem desligar KV)

1) Criar as tabelas SQL e politicas RLS (arquivos `supabase/sql/00_init.sql` e `supabase/sql/01_rls.sql`).
2) Rodar um ETL de leitura do KV -> insercao no SQL (uma Edge Function temporaria ou script Node).
3) Ativar dual-write nos endpoints do backend (KV + SQL) em rotas criticas, quando for seguro.
4) Gradualmente trocar as leituras para SQL, mantendo fallback no KV.
5) Quando o SQL estiver consistente, desativar KV aos poucos por modulo.

