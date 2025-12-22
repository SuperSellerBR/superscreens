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
const PER_PAGE = 1000;

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

const listAllUsers = async () => {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });
    if (error) throw error;
    users.push(...(data?.users || []));
    if (!data?.users || data.users.length < PER_PAGE) break;
    page += 1;
  }
  return users;
};

const getProfilesByLegacyIds = async (legacyIds) => {
  if (!legacyIds.length) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, legacy_id, email, role")
    .in("legacy_id", legacyIds);
  if (error) throw error;
  return data || [];
};

const ensureAuthUser = async (email, metadata) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: crypto.randomBytes(16).toString("hex"),
    email_confirm: true,
    user_metadata: metadata,
  });

  if (!error && data?.user?.id) return data.user.id;

  if (error && (error.code === "email_exists" || String(error.message || "").includes("registered"))) {
    return null;
  }

  throw error || new Error("Failed to create auth user");
};

const upsertProfiles = async (rows) => {
  if (!rows.length) return;
  for (const batch of chunk(rows, 200)) {
    const { error } = await supabase.from("profiles").upsert(batch, { onConflict: "id" });
    if (error) throw error;
  }
};

const insertMediaItems = async (rows) => {
  if (!rows.length) return;
  for (const batch of chunk(rows, 200)) {
    const { error } = await supabase.from("media_items").insert(batch);
    if (error) throw error;
  }
};

const insertAds = async (rows) => {
  if (!rows.length) return;
  for (const batch of chunk(rows, 200)) {
    const { error } = await supabase.from("ads").insert(batch);
    if (error) throw error;
  }
};

const main = async () => {
  const legacyAdvertisers = (await getKvValue("advertisers")) || [];
  console.log(`Legacy advertisers: ${legacyAdvertisers.length}`);

  if (!legacyAdvertisers.length) {
    console.log("No legacy advertisers found.");
    return;
  }

  const legacyIds = legacyAdvertisers.map((ad) => String(ad.id));
  const existingProfiles = await getProfilesByLegacyIds(legacyIds);
  const profilesByLegacy = new Map(existingProfiles.map((p) => [String(p.legacy_id), p]));

  const authUsers = await listAllUsers();
  const authByEmail = new Map(authUsers.map((u) => [String(u.email || "").toLowerCase(), u]));

  const profilesToUpsert = [];
  let createdAuth = 0;
  let skippedAuth = 0;

  for (const advertiser of legacyAdvertisers) {
    const legacyId = String(advertiser.id);
    const existingProfile = profilesByLegacy.get(legacyId);

    if (existingProfile) continue;

    const name = advertiser.name || `Advertiser ${legacyId}`;
    const email = (advertiser.email || `legacy-advertiser+${legacyId}@superscreens.local`).toLowerCase();
    let authUserId = null;

    const existingAuth = authByEmail.get(email);
    if (existingAuth?.id) {
      authUserId = existingAuth.id;
    } else {
      const metadata = {
        role: "advertiser",
        legacy_advertiser_id: legacyId,
        name: name,
      };
      const createdId = await ensureAuthUser(email, metadata);
      if (createdId) {
        authUserId = createdId;
        authByEmail.set(email, { id: createdId, email });
        createdAuth += 1;
      } else {
        skippedAuth += 1;
        const fallbackAuth = authByEmail.get(email);
        authUserId = fallbackAuth?.id || null;
      }
    }

    if (!authUserId) {
      console.warn(`Skipping advertiser ${legacyId}: no auth user`);
      continue;
    }

    profilesToUpsert.push({
      id: authUserId,
      legacy_id: legacyId,
      email: email,
      role: "advertiser",
      nome_fantasia: advertiser.name || null,
      logo_url: advertiser.logoUrl || null,
      status: "active",
    });
  }

  await upsertProfiles(profilesToUpsert);
  console.log(`Profiles upserted: ${profilesToUpsert.length}`);
  console.log(`Auth users created: ${createdAuth} (skipped: ${skippedAuth})`);

  const allProfiles = await getProfilesByLegacyIds(legacyIds);
  const profileIdByLegacy = new Map(allProfiles.map((p) => [String(p.legacy_id), p.id]));

  let mediaInserted = 0;
  let adsInserted = 0;

  for (const advertiser of legacyAdvertisers) {
    const legacyId = String(advertiser.id);
    const advertiserId = profileIdByLegacy.get(legacyId);
    if (!advertiserId) continue;

    const media = Array.isArray(advertiser.media) ? advertiser.media : [];
    if (!media.length) continue;

    const { data: existingMedia, error: mediaError } = await supabase
      .from("media_items")
      .select("id, legacy_id")
      .eq("owner_id", advertiserId)
      .in("legacy_id", media.map((m) => String(m.id)));
    if (mediaError) throw mediaError;

    const mediaByLegacy = new Map((existingMedia || []).map((m) => [String(m.legacy_id), m.id]));

    const newMediaRows = [];

    for (const item of media) {
      const itemLegacyId = item.id ? String(item.id) : null;
      if (!itemLegacyId) continue;

      if (mediaByLegacy.has(itemLegacyId)) continue;

      const mediaId = crypto.randomUUID();
      mediaByLegacy.set(itemLegacyId, mediaId);

      newMediaRows.push({
        id: mediaId,
        legacy_id: itemLegacyId,
        owner_id: advertiserId,
        title: item.title || null,
        url: item.url || null,
        path: item.path || null,
        type: item.type || null,
        duration: item.duration ?? null,
        layout: item.layout || null,
        metadata: {
          source: "legacy_advertisers",
        },
      });
    }

    if (newMediaRows.length) {
      await insertMediaItems(newMediaRows);
      mediaInserted += newMediaRows.length;
    }

    const { data: existingAds, error: adsError } = await supabase
      .from("ads")
      .select("media_item_id")
      .eq("advertiser_id", advertiserId);
    if (adsError) throw adsError;

    const existingMediaIds = new Set((existingAds || []).map((ad) => ad.media_item_id));

    const newAdsRows = [];

    for (const item of media) {
      const itemLegacyId = item.id ? String(item.id) : null;
      if (!itemLegacyId) continue;
      const mediaId = mediaByLegacy.get(itemLegacyId);
      if (!mediaId) continue;
      if (existingMediaIds.has(mediaId)) continue;

      newAdsRows.push({
        advertiser_id: advertiserId,
        media_item_id: mediaId,
        layout: item.layout || "fullscreen",
        active: true,
      });
    }

    if (newAdsRows.length) {
      await insertAds(newAdsRows);
      adsInserted += newAdsRows.length;
    }
  }

  console.log(`Media items inserted: ${mediaInserted}`);
  console.log(`Ads inserted: ${adsInserted}`);
  console.log("Legacy advertisers migration completed.");
};

main().catch((err) => {
  console.error("Advertisers migration failed:", err);
  process.exit(1);
});
