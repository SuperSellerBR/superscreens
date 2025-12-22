"use strict";

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const KV_TABLE = "kv_store_70a2af89";

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

const countTable = async (table) => {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count || 0;
};

const sample = (arr, size = 3) => arr.slice(0, size);

const main = async () => {
  const report = [];

  const usersList = (await getKvValue("users_list")) || [];
  const mediaLibrary = (await getKvValue("media_library")) || [];
  const playlistsIndex = (await getKvValue("playlists_index")) || [];
  const activityLog = (await getKvValue("activity_log")) || [];

  const kvActivePlaylists = await getKvByPrefix("active_playlist_");
  const kvPlaylistData = await getKvByPrefix("playlist_data_");
  const kvClientAds = await getKvByPrefix("client_ads_");
  const kvPlayerStatus = await getKvByPrefix("player_status_");
  const kvNewsRss = await getKvByPrefix("news_rss_url_");
  const kvLogoUrl = await getKvByPrefix("config_logo_url_");
  const kvTemplates = await getKvByPrefix("active_template_");
  const kvCycle = await getKvByPrefix("config_cycle_ratio_");

  const profilesCount = await countTable("profiles");
  const mediaCount = await countTable("media_items");
  const playlistsCount = await countTable("playlists");
  const activityCount = await countTable("activity_logs");
  const playerStatusCount = await countTable("player_status");
  const userConfigsCount = await countTable("user_configs");
  const clientAdvertisersCount = await countTable("client_advertisers");

  report.push({
    key: "profiles",
    kv: usersList.length,
    sql: profilesCount,
  });
  report.push({
    key: "media_items",
    kv: mediaLibrary.length,
    sql: mediaCount,
  });
  report.push({
    key: "playlists",
    kv: playlistsIndex.length + kvActivePlaylists.length,
    sql: playlistsCount,
    note: "kv includes playlists_index + active_playlist_*",
  });
  report.push({
    key: "activity_logs",
    kv: activityLog.length,
    sql: activityCount,
  });
  report.push({
    key: "player_status",
    kv: kvPlayerStatus.length,
    sql: playerStatusCount,
  });
  report.push({
    key: "user_configs",
    kv: kvNewsRss.length + kvLogoUrl.length + kvTemplates.length + kvCycle.length,
    sql: userConfigsCount,
    note: "kv counts keys; sql counts rows",
  });
  report.push({
    key: "client_advertisers",
    kv: kvClientAds.length,
    sql: clientAdvertisersCount,
    note: "kv counts keys; sql counts rows",
  });

  const samples = {
    profiles: sample(usersList),
    media_items: sample(mediaLibrary),
    playlists_index: sample(playlistsIndex),
    playlist_data: sample(kvPlaylistData),
    active_playlist: sample(kvActivePlaylists),
  };

  console.log("KV vs SQL counts:");
  report.forEach((row) => {
    const note = row.note ? ` (${row.note})` : "";
    console.log(`- ${row.key}: kv=${row.kv} sql=${row.sql}${note}`);
  });

  console.log("\nSample KV payloads (first 3):");
  Object.entries(samples).forEach(([key, value]) => {
    console.log(`- ${key}: ${JSON.stringify(value, null, 2)}`);
  });
};

main().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
