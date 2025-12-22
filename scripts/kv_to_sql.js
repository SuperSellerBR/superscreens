"use strict";

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const KV_TABLE = "kv_store_70a2af89";

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const toIso = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const getKvValue = async (key) => {
  const { data, error } = await supabase
    .from(KV_TABLE)
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data?.value;
};

const getKvByPrefix = async (prefix) => {
  const { data, error } = await supabase
    .from(KV_TABLE)
    .select("key,value")
    .like("key", `${prefix}%`);
  if (error) throw error;
  return data || [];
};

const upsertBatch = async (table, rows, onConflict) => {
  if (!rows.length) return;
  const batches = chunk(rows, 200);
  for (const batch of batches) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) throw error;
  }
};

const insertBatch = async (table, rows) => {
  if (!rows.length) return;
  const batches = chunk(rows, 200);
  for (const batch of batches) {
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw error;
  }
};

const main = async () => {
  console.log("Loading KV data...");

  const usersList = (await getKvValue("users_list")) || [];
  const mediaLibrary = (await getKvValue("media_library")) || [];
  const playlistsIndex = (await getKvValue("playlists_index")) || [];
  const activityLog = (await getKvValue("activity_log")) || [];
  const youtubeApiKey = await getKvValue("youtube_api_key");

  const newsRssKeys = await getKvByPrefix("news_rss_url_");
  const logoUrlKeys = await getKvByPrefix("config_logo_url_");
  const templateKeys = await getKvByPrefix("active_template_");
  const cycleKeys = await getKvByPrefix("config_cycle_ratio_");
  const clientAdsKeys = await getKvByPrefix("client_ads_");
  const activePlaylistKeys = await getKvByPrefix("active_playlist_");
  const activePlaylistSettingsKeys = await getKvByPrefix("active_playlist_settings_");
  const playlistDataKeys = await getKvByPrefix("playlist_data_");
  const playerStatusKeys = await getKvByPrefix("player_status_");

  const statsTotalImpressions = await getKvValue("stats_total_impressions");
  const statsJukeboxRequests = await getKvValue("stats_jukebox_requests");
  const statsJukeboxDaily = await getKvValue("stats_jukebox_daily");
  const statsJukeboxDailyBackup = await getKvValue("stats_jukebox_daily_backup");

  const validUserIds = new Set(
    usersList.map((u) => u.id).filter((id) => isUuid(id))
  );

  console.log(`Profiles: ${usersList.length}`);
  const profileRows = usersList
    .filter((u) => isUuid(u.id))
    .map((u) => {
      const row = {
        id: u.id,
        email: u.email || null,
        role: u.role || "client",
        nome_fantasia: u.nomeFantasia || u.nome_fantasia || u.name || null,
        razao_social: u.razaoSocial || u.razao_social || null,
        logo_url: u.logoUrl || u.logo_url || null,
        logo_path: u.logoPath || u.logo_path || null,
        rss_url: u.rssUrl || u.rss_url || null,
        status: u.status || (u.active === false ? "inactive" : "active"),
      };
      const createdAt = toIso(u.createdAt || u.created_at);
      if (createdAt) row.created_at = createdAt;
      return row;
    });

  await upsertBatch("profiles", profileRows, "id");
  console.log("Profiles upserted.");

  const configMap = new Map();

  const ensureConfig = (userId) => {
    if (!configMap.has(userId)) configMap.set(userId, { user_id: userId });
    return configMap.get(userId);
  };

  for (const entry of newsRssKeys) {
    const userId = entry.key.replace("news_rss_url_", "");
    if (!validUserIds.has(userId)) continue;
    ensureConfig(userId).news_rss_url = entry.value || null;
  }

  for (const entry of logoUrlKeys) {
    const userId = entry.key.replace("config_logo_url_", "");
    if (!validUserIds.has(userId)) continue;
    ensureConfig(userId).logo_url = entry.value || null;
  }

  for (const entry of templateKeys) {
    const userId = entry.key.replace("active_template_", "");
    if (!validUserIds.has(userId)) continue;
    ensureConfig(userId).active_template = entry.value || "fullscreen";
  }

  for (const entry of cycleKeys) {
    const userId = entry.key.replace("config_cycle_ratio_", "");
    if (!validUserIds.has(userId)) continue;
    ensureConfig(userId).cycle_ratio = entry.value ?? 70;
  }

  const userConfigRows = Array.from(configMap.values());
  await upsertBatch("user_configs", userConfigRows, "user_id");
  console.log("User configs upserted.");

  if (youtubeApiKey) {
    await upsertBatch("global_config", [{ key: "youtube_api_key", value: youtubeApiKey }], "key");
    console.log("Global config upserted.");
  }

  const mediaRows = mediaLibrary.map((item) => {
    const legacyId = item.id ? String(item.id) : null;
    const id = isUuid(item.id) ? item.id : crypto.randomUUID();
    const ownerId = validUserIds.has(item.ownerId) ? item.ownerId : null;
    const metadata = {};

    if (item.uploadedAt) metadata.uploadedAt = item.uploadedAt;
    if (item.size) metadata.size = item.size;
    if (legacyId) metadata.legacyId = legacyId;

    return {
      id,
      legacy_id: legacyId,
      owner_id: ownerId,
      title: item.title || null,
      url: item.url || null,
      path: item.path || null,
      type: item.type || null,
      duration: item.duration ?? null,
      layout: item.layout || null,
      metadata: metadata,
      created_at: toIso(item.createdAt || item.created_at || item.uploadedAt),
    };
  });

  await upsertBatch("media_items", mediaRows, "id");
  console.log("Media items upserted.");

  const playlistRowMap = new Map();
  const playlistIdMap = new Map();

  const ensurePlaylistRow = (id) => {
    if (!playlistRowMap.has(id)) playlistRowMap.set(id, { id });
    return playlistRowMap.get(id);
  };

  for (const p of playlistsIndex) {
    const legacyId = p.id ? String(p.id) : null;
    const id = isUuid(p.id) ? p.id : crypto.randomUUID();
    if (legacyId) playlistIdMap.set(legacyId, id);

    const row = ensurePlaylistRow(id);
    row.legacy_id = legacyId;
    row.owner_id = validUserIds.has(p.ownerId) ? p.ownerId : null;
    row.name = p.name || p.title || null;
    row.created_at = toIso(p.createdAt || p.created_at) || row.created_at;
    row.updated_at = toIso(p.updatedAt || p.updated_at) || row.updated_at;
  }

  for (const entry of playlistDataKeys) {
    const legacyId = entry.key.replace("playlist_data_", "");
    const mappedId = playlistIdMap.get(legacyId) || crypto.randomUUID();
    if (!playlistIdMap.has(legacyId)) playlistIdMap.set(legacyId, mappedId);

    const row = ensurePlaylistRow(mappedId);
    row.legacy_id = row.legacy_id || legacyId;

    if (Array.isArray(entry.value)) {
      row.items = entry.value;
      row.settings = { shuffle: false };
    } else if (entry.value && typeof entry.value === "object") {
      row.items = entry.value.items || [];
      row.settings = entry.value.settings || { shuffle: !!entry.value.shuffle };
    }
  }

  const activeSettingsMap = new Map();
  for (const entry of activePlaylistSettingsKeys) {
    const userId = entry.key.replace("active_playlist_settings_", "");
    if (!validUserIds.has(userId)) continue;
    activeSettingsMap.set(userId, entry.value || {});
  }

  for (const entry of activePlaylistKeys) {
    const userId = entry.key.replace("active_playlist_", "");
    if (!validUserIds.has(userId)) continue;

    const legacyId = `active:${userId}`;
    const mappedId = playlistIdMap.get(legacyId) || crypto.randomUUID();
    if (!playlistIdMap.has(legacyId)) playlistIdMap.set(legacyId, mappedId);

    const row = ensurePlaylistRow(mappedId);
    row.legacy_id = legacyId;
    row.owner_id = userId;
    row.name = row.name || "Active Playlist";
    row.items = entry.value || [];
    row.settings = activeSettingsMap.get(userId) || { shuffle: false };
  }

  const playlistRows = Array.from(playlistRowMap.values());
  await upsertBatch("playlists", playlistRows, "id");
  console.log("Playlists upserted.");

  const clientAdvertiserRows = [];
  for (const entry of clientAdsKeys) {
    const clientId = entry.key.replace("client_ads_", "");
    if (!validUserIds.has(clientId)) continue;
    const advertiserIds = Array.isArray(entry.value) ? entry.value : [];
    advertiserIds.forEach((advertiserId) => {
      if (!validUserIds.has(advertiserId)) return;
      clientAdvertiserRows.push({
        client_id: clientId,
        advertiser_id: advertiserId,
      });
    });
  }

  await upsertBatch("client_advertisers", clientAdvertiserRows, "client_id,advertiser_id");
  console.log("Client advertisers upserted.");

  const activityRows = (activityLog || []).map((entry) => ({
    message: entry.text || entry.message || "",
    type: entry.type || null,
    created_at: toIso(entry.time) || undefined,
  }));

  await insertBatch("activity_logs", activityRows);
  console.log("Activity logs inserted.");

  const playerStatusRows = playerStatusKeys
    .map((entry) => {
      const value = entry.value || {};
      const userId = value.id || entry.key.replace("player_status_", "");
      if (!validUserIds.has(userId)) return null;
      const lastSeen = value.lastSeen || value.last_seen;
      if (!lastSeen) return null;
      return {
        user_id: userId,
        last_seen: toIso(lastSeen) || new Date(Number(lastSeen)).toISOString(),
        current_media: value.currentMedia || value.current_media || null,
        is_online: value.isOnline !== undefined ? value.isOnline : true,
      };
    })
    .filter(Boolean);

  await upsertBatch("player_status", playerStatusRows, "user_id");
  console.log("Player status upserted.");

  const dailyStats = statsJukeboxDaily && Object.keys(statsJukeboxDaily).length
    ? statsJukeboxDaily
    : (statsJukeboxDailyBackup || {});

  const jukeboxDailyRows = Object.entries(dailyStats).map(([day, count]) => ({
    day,
    count,
  }));

  await upsertBatch("jukebox_stats_daily", jukeboxDailyRows, "day");
  console.log("Jukebox daily stats upserted.");

  const systemStatsRows = [];
  if (statsTotalImpressions !== undefined) {
    systemStatsRows.push({
      key: "stats_total_impressions",
      value: statsTotalImpressions,
    });
  }
  if (statsJukeboxRequests !== undefined) {
    systemStatsRows.push({
      key: "stats_jukebox_requests",
      value: statsJukeboxRequests,
    });
  }

  await upsertBatch("system_stats", systemStatsRows, "key");
  console.log("System stats upserted.");

  console.log("KV to SQL migration completed.");
};

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
