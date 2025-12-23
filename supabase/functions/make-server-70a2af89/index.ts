import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Initialize Supabase Admin Client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUCKET_NAME = "make-70a2af89-media";

// Ensure Bucket Exists
(async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    if (!bucketExists) {
      console.log(`Creating bucket ${BUCKET_NAME}...`);
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['image/*', 'video/*']
      });
    }
  } catch (err) {
    console.error("Error checking/creating bucket:", err);
  }
})();


// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-70a2af89/health", (c) => {
  return c.json({ status: "ok" });
});

const getUser = async (c: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return null;
  
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (e) {
    return null;
  }
};

// Helper to get effective User ID (from token or query param for Player)
const getEffectiveUserId = async (c: any) => {
    // 1. Try Token
    const user = await getUser(c);
    if (user) return user.id;

    // 2. Try Query Param (Public Player Access)
    // Note: This allows public reading of configs if they guess the UID. 
    // Given the nature of Digital Signage players (often untrusted devices), this is common.
    // We assume the UID is semi-private or acceptable to be public for reading content.
    const uid = c.req.query('uid');
    if (uid) return uid;

    return null;
}

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const getProfileName = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("nome_fantasia, razao_social, email")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.nome_fantasia || data.razao_social || data.email || null;
};

const getPlaylistByExternalId = async (id: string) => {
  const query = supabase.from("playlists").select("id, legacy_id, owner_id, items, settings");
  const { data, error } = await (isUuid(id)
    ? query.eq("id", id).maybeSingle()
    : query.eq("legacy_id", id).maybeSingle());
  if (error) throw error;
  return data;
};

const getActivePlaylist = async (userId: string) => {
  const legacyId = `active:${userId}`;
  const { data, error } = await supabase
    .from("playlists")
    .select("id, items, settings")
    .eq("legacy_id", legacyId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const upsertActivePlaylist = async (userId: string, items: any[], settings?: any) => {
  const legacyId = `active:${userId}`;
  const { data: existing, error: existingError } = await supabase
    .from("playlists")
    .select("id")
    .eq("legacy_id", legacyId)
    .maybeSingle();
  if (existingError) throw existingError;

  const payload = {
    legacy_id: legacyId,
    owner_id: userId,
    name: "Active Playlist",
    items: items || [],
    settings: settings || { shuffle: false },
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("playlists")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("playlists")
    .insert(payload)
    .select("id")
    .single();
  if (insertError) throw insertError;
  return inserted.id;
};

// Helper to sign URL if needed
const signMediaUrl = async (item: any) => {
  if (item.path) {
    // If it has a storage path, generate a fresh signed URL
    const { data } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(item.path, 3600 * 24); // 24 hours
      
    if (data?.signedUrl) {
      return { ...item, url: data.signedUrl };
    }
  }
  return item;
};

// --- User Sync Endpoint ---
app.post("/make-server-70a2af89/users/sync", async (c) => {
    try {
        const user = await getUser(c);
        // Only Admin can sync
        if (!user || user.user_metadata?.role !== 'admin') {
            return c.json({ error: "Unauthorized" }, 401);
        }

        // Use SERVICE ROLE key to access all users
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') || '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        );

        // Fetch all auth users
        const { data: { users: authUsers }, error } = await supabaseAdmin.auth.admin.listUsers();
        
        if (error) {
            console.error("Auth list error:", error);
            return c.json({ error: "Failed to fetch auth users" }, 500);
        }

        const { data: existingProfiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, email, nome_fantasia");

        if (profileError) {
            console.error("Profiles list error:", profileError);
            return c.json({ error: "Failed to fetch profiles" }, 500);
        }

        const profileById = new Map((existingProfiles || []).map((p: any) => [p.id, p]));

        let addedCount = 0;

        const rows = authUsers.map((authUser: any) => {
            const existing = profileById.get(authUser.id);
            if (existing) {
                return {
                    id: authUser.id,
                    email: authUser.email || existing.email,
                };
            }

            addedCount++;
            console.log(`[Sync] Restoring missing user: ${authUser.email}`);
            return {
                id: authUser.id,
                email: authUser.email,
                role: authUser.user_metadata?.role || 'user',
                nome_fantasia: authUser.user_metadata?.name || "",
                status: 'active'
            };
        });

        const { error: upsertError } = await supabase
            .from("profiles")
            .upsert(rows, { onConflict: "id" });

        if (upsertError) {
            console.error("Profiles upsert error:", upsertError);
            return c.json({ error: "Failed to sync profiles" }, 500);
        }

        return c.json({
            success: true,
            total: rows.length,
            added: addedCount
        });

    } catch (e) {
        console.error("Sync error:", e);
        return c.json({ error: "Sync failed" }, 500);
    }
});

// --- Ad Distribution Endpoints ---

// 1. Link Advertisers to Client
app.post("/make-server-70a2af89/advertise/distribute", async (c) => {
  try {
    const user = await getUser(c);
    // Only Admin can distribute ads
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { clientId, advertiserIds } = await c.req.json();
    if (!clientId) return c.json({ error: "Client ID required" }, 400);

    const ids = Array.isArray(advertiserIds) ? advertiserIds : [];

    const { error: deleteError } = await supabase
      .from("client_advertisers")
      .delete()
      .eq("client_id", clientId);
    if (deleteError) throw deleteError;

    if (ids.length > 0) {
      const rows = ids.map((id: string) => ({
        client_id: clientId,
        advertiser_id: id
      }));
      const { error: insertError } = await supabase
        .from("client_advertisers")
        .insert(rows);
      if (insertError) throw insertError;
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to save distribution" }, 500);
  }
});

// 2. Get Linked Advertisers for Client
app.get("/make-server-70a2af89/advertise/distribute/:clientId", async (c) => {
  try {
    const clientId = c.req.param("clientId");
    const { data, error } = await supabase
      .from("client_advertisers")
      .select("advertiser_id")
      .eq("client_id", clientId);
    if (error) throw error;
    return c.json({ advertiserIds: (data || []).map((row: any) => row.advertiser_id) });
  } catch (error) {
    return c.json({ advertiserIds: [] });
  }
});


// Playlist endpoints
app.post("/make-server-70a2af89/playlist/publish", async (c) => {
  try {
    const user = await getUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { playlist, targetUserId, settings } = await c.req.json();
    if (!playlist) {
      return c.json({ error: "Playlist data is required" }, 400);
    }
    
    let targetId = user.id;
    if (targetUserId && user.user_metadata?.role === 'admin') {
        targetId = targetUserId;
    }
    
    await upsertActivePlaylist(targetId, playlist, settings);

    const userName = await getProfileName(targetId);
    await logActivity(`Playlist publicada para ${userName || "Usuário"}`, 'media');
    
    return c.json({ success: true, message: "Playlist published successfully" });
  } catch (error) {
    console.error("Failed to publish playlist:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// --- Advertisers Endpoints ---

app.get("/make-server-70a2af89/advertisers", async (c) => {
  try {
    const uid = c.req.query('uid');
    let advertiserIds: string[] = [];

    if (uid) {
      const { data: links, error: linkError } = await supabase
        .from("client_advertisers")
        .select("advertiser_id")
        .eq("client_id", uid);
      if (linkError) throw linkError;
      advertiserIds = (links || []).map((row: any) => row.advertiser_id);
    } else {
      const { data: advertisers, error: advertisersError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "advertiser");
      if (advertisersError) throw advertisersError;
      advertiserIds = (advertisers || []).map((row: any) => row.id);
    }

    if (advertiserIds.length === 0) {
      return c.json({ advertisers: [] });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, nome_fantasia, razao_social, email, logo_url, logo_path")
      .in("id", advertiserIds);
    if (profilesError) throw profilesError;

    const { data: ads, error: adsError } = await supabase
      .from("ads")
      .select("advertiser_id, layout, media_items(*)")
      .in("advertiser_id", advertiserIds)
      .eq("active", true);
    if (adsError) throw adsError;

    const mediaByAdvertiser = new Map<string, any[]>();

    for (const ad of ads || []) {
      const mediaItem = ad.media_items;
      if (!mediaItem) continue;
      const signedItem = await signMediaUrl(mediaItem);
      const withLayout = { ...signedItem, layout: ad.layout || signedItem.layout || 'all' };
      const list = mediaByAdvertiser.get(ad.advertiser_id) || [];
      list.push(withLayout);
      mediaByAdvertiser.set(ad.advertiser_id, list);
    }

    const advertisers = await Promise.all((profiles || []).map(async (profile: any) => {
      let logoUrl = profile.logo_url || null;
      if (!logoUrl && profile.logo_path) {
        const { data } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(profile.logo_path, 3600);
        if (data?.signedUrl) logoUrl = data.signedUrl;
      }
      return {
        id: profile.id,
        name: profile.nome_fantasia || profile.razao_social || profile.email || "Anunciante",
        logoUrl,
        media: mediaByAdvertiser.get(profile.id) || []
      };
    }));

    return c.json({ advertisers });
  } catch (error) {
    console.error("Get advertisers error:", error);
    return c.json({ advertisers: [] });
  }
});

app.get("/make-server-70a2af89/advertisers/:id/media", async (c) => {
  try {
    const user = await getUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const advertiserId = c.req.param("id");
    if (user.user_metadata?.role !== 'admin' && user.id !== advertiserId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { data: ads, error } = await supabase
      .from("ads")
      .select("layout, media_items(*)")
      .eq("advertiser_id", advertiserId)
      .eq("active", true);
    if (error) throw error;

    const media = await Promise.all((ads || []).map(async (ad: any) => {
      if (!ad.media_items) return null;
      const signed = await signMediaUrl(ad.media_items);
      return {
        ...signed,
        layout: ad.layout || signed.layout || 'all'
      };
    }));

    return c.json({ media: media.filter(Boolean) });
  } catch (error) {
    return c.json({ media: [] });
  }
});

app.post("/make-server-70a2af89/advertisers/:id/media", async (c) => {
  try {
    const user = await getUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const advertiserId = c.req.param("id");
    if (user.user_metadata?.role !== 'admin' && user.id !== advertiserId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { mediaItem } = await c.req.json();
    if (!mediaItem?.url) return c.json({ error: "Missing media item" }, 400);

    const legacyId = mediaItem.id ? String(mediaItem.id) : null;
    const id = legacyId && isUuid(legacyId) ? legacyId : crypto.randomUUID();

    const { error: mediaError } = await supabase
      .from("media_items")
      .insert({
        id,
        legacy_id: legacyId,
        owner_id: advertiserId,
        title: mediaItem.title || null,
        url: mediaItem.url,
        path: mediaItem.path || null,
        type: mediaItem.type || null,
        duration: mediaItem.duration ?? null,
        layout: mediaItem.layout || null,
        metadata: mediaItem.metadata || {}
      });
    if (mediaError) throw mediaError;

    const { error: adError } = await supabase
      .from("ads")
      .insert({
        advertiser_id: advertiserId,
        media_item_id: id,
        layout: mediaItem.layout || 'fullscreen',
        active: true
      });
    if (adError) throw adError;

    return c.json({ success: true, id });
  } catch (error) {
    return c.json({ error: "Failed to save media" }, 500);
  }
});

app.delete("/make-server-70a2af89/advertisers/:id/media/:mediaId", async (c) => {
  try {
    const user = await getUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const advertiserId = c.req.param("id");
    const mediaId = c.req.param("mediaId");
    if (user.user_metadata?.role !== 'admin' && user.id !== advertiserId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const query = supabase.from("media_items").select("id");
    const { data: mediaItem, error: mediaError } = await (isUuid(mediaId)
      ? query.eq("id", mediaId).eq("owner_id", advertiserId).maybeSingle()
      : query.eq("legacy_id", mediaId).eq("owner_id", advertiserId).maybeSingle());
    if (mediaError) throw mediaError;

    if (!mediaItem) return c.json({ success: true });

    const { error: adDeleteError } = await supabase
      .from("ads")
      .delete()
      .eq("advertiser_id", advertiserId)
      .eq("media_item_id", mediaItem.id);
    if (adDeleteError) throw adDeleteError;

    const { error: mediaDeleteError } = await supabase
      .from("media_items")
      .delete()
      .eq("id", mediaItem.id);
    if (mediaDeleteError) throw mediaDeleteError;

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete media" }, 500);
  }
});


app.post("/make-server-70a2af89/advertisers", async (c) => {
  try {
    const { advertisers } = await c.req.json();
    if (!Array.isArray(advertisers)) return c.json({ error: "Invalid payload" }, 400);

    const createdProfiles = [];

    for (const advertiser of advertisers) {
      const legacyId = advertiser.id ? String(advertiser.id) : null;
      const email = advertiser.email || `legacy-advertiser+${legacyId}@superscreens.local`;

      const { data: existing, error: existingError } = await supabase
        .from("profiles")
        .select("id")
        .eq("legacy_id", legacyId)
        .maybeSingle();
      if (existingError) throw existingError;

      let profileId = existing?.id;
      if (!profileId) {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: { role: "advertiser", name: advertiser.name }
        });
        if (authError) throw authError;
        profileId = authUser?.user?.id;
      }

      if (!profileId) continue;

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: profileId,
          legacy_id: legacyId,
          email,
          role: "advertiser",
          nome_fantasia: advertiser.name || null,
          logo_url: advertiser.logoUrl || null
        }, { onConflict: "id" });
      if (upsertError) throw upsertError;

      createdProfiles.push(profileId);
    }

    return c.json({ success: true, profiles: createdProfiles });
  } catch (error) {
    return c.json({ error: "Failed to save advertisers" }, 500);
  }
});

// --- Playlist Logic (Merged with Ads) ---

app.get("/make-server-70a2af89/playlist/active", async (c) => {
  try {
    const userId = await getEffectiveUserId(c);
    if (!userId) return c.json({ playlist: [] });
    
    // Support raw fetch for admin management
    const raw = c.req.query('raw') === 'true';

    const { data: userConfig, error: configError } = await supabase
      .from("user_configs")
      .select("active_template")
      .eq("user_id", userId)
      .maybeSingle();
    if (configError) throw configError;

    const activePlaylist = await getActivePlaylist(userId);

    // If Admin requested RAW data (just what is saved, no injection), return it immediately
    if (raw) {
       const items = activePlaylist?.items || [];
       return c.json({ playlist: items, settings: activePlaylist?.settings || { shuffle: false } });
    }

    const template = userConfig?.active_template || 'fullscreen';
    const rawPlaylist = activePlaylist?.items || [];
    const signedPlaylist = await Promise.all(
      rawPlaylist.map(async (item: any) => await signMediaUrl(item))
    );

    const { data: linkedRows, error: linkedError } = await supabase
      .from("client_advertisers")
      .select("advertiser_id")
      .eq("client_id", userId);
    if (linkedError) throw linkedError;
    const linkedIds = (linkedRows || []).map((row: any) => row.advertiser_id);

    let advertiserIds = linkedIds;
    if (advertiserIds.length === 0) {
      const { data: allAdvertisers, error: allAdvertisersError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "advertiser");
      if (allAdvertisersError) throw allAdvertisersError;
      advertiserIds = (allAdvertisers || []).map((row: any) => row.id);
    }

    let ads: any[] = [];
    if (advertiserIds.length > 0) {
      const { data: adRows, error: adsError } = await supabase
        .from("ads")
        .select("advertiser_id, layout, media_items(*)")
        .in("advertiser_id", advertiserIds)
        .eq("active", true);
      if (adsError) throw adsError;
      ads = adRows || [];
    }

    const signedAds = await Promise.all((ads || []).map(async (ad: any) => {
      const media = ad.media_items;
      if (!media) return null;
      const layout = ad.layout || media.layout || 'all';
      if (!(layout === 'all' || layout === template)) return null;
      const signed = await signMediaUrl(media);
      return {
        ...signed,
        layout,
        isAd: true,
        advertiserId: ad.advertiser_id,
        id: `ad-${ad.advertiser_id}-${media.id}-${Math.random().toString(36).slice(2, 7)}`
      };
    }));

    const validAds = signedAds.filter(Boolean);

    // 3. Merge Playlist + Ads
    // Strategy: Insert 1 Ad every 2 content items
    const mergedPlaylist = [];
    let adIndex = 0;

    if (signedPlaylist.length > 0) {
      signedPlaylist.forEach((item: any, index: number) => {
        mergedPlaylist.push(item);
        
        // Inject ad after every 2 items, if we have ads
        if ((index + 1) % 2 === 0 && validAds.length > 0) {
          mergedPlaylist.push(validAds[adIndex % validAds.length]);
          adIndex++;
        }
      });
    } else if (validAds.length > 0) {
      // If playlist is empty but we have ads, show ads
      mergedPlaylist.push(...validAds);
    }

    return c.json({ playlist: mergedPlaylist, settings: activePlaylist?.settings || { shuffle: false } });
  } catch (error) {
    console.error("Failed to get active playlist:", error);
    return c.json({ playlist: [] });
  }
});

// Config Endpoints
app.post("/make-server-70a2af89/config/youtube", async (c) => {
  try {
    const { apiKey } = await c.req.json();
    const user = await getUser(c);
    
    // Only admins can set the global API key
    if (!user || user.user_metadata?.role !== 'admin') {
         return c.json({ error: "Unauthorized" }, 401);
    }

    if (!apiKey) {
      return c.json({ error: "API Key is required" }, 400);
    }
    // Shared Global Key
    const { error } = await supabase
      .from("global_config")
      .upsert({ key: "youtube_api_key", value: apiKey }, { onConflict: "key" });
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to save config" }, 500);
  }
});

app.get("/make-server-70a2af89/config/youtube", async (c) => {
  try {
    // Shared Global Key (accessible to anyone with access to the system/player)
    const { data, error } = await supabase
      .from("global_config")
      .select("value")
      .eq("key", "youtube_api_key")
      .maybeSingle();
    if (error) throw error;
    return c.json({ apiKey: data?.value || "" });
  } catch (error) {
    return c.json({ apiKey: "" });
  }
});

app.post("/make-server-70a2af89/config/news", async (c) => {
  try {
    const { rssUrl } = await c.req.json();
    const user = await getUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { error } = await supabase
      .from("user_configs")
      .upsert({ user_id: user.id, news_rss_url: rssUrl }, { onConflict: "user_id" });
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to save news config" }, 500);
  }
});

app.get("/make-server-70a2af89/config/news", async (c) => {
  try {
    const userId = await getEffectiveUserId(c);
    if (!userId) return c.json({ rssUrl: "https://www.cnnbrasil.com.br/feed/" });

    const { data, error } = await supabase
      .from("user_configs")
      .select("news_rss_url")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    // Default to CNN Brasil if not set
    return c.json({ rssUrl: data?.news_rss_url || "https://www.cnnbrasil.com.br/feed/" });
  } catch (error) {
    return c.json({ rssUrl: "" });
  }
});

// Logo Config
app.post("/make-server-70a2af89/config/logo", async (c) => {
  try {
    const { logoUrl } = await c.req.json();
    const user = await getUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { error } = await supabase
      .from("user_configs")
      .upsert({ user_id: user.id, logo_url: logoUrl }, { onConflict: "user_id" });
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to save logo config" }, 500);
  }
});

app.get("/make-server-70a2af89/config/logo", async (c) => {
  try {
    const userId = await getEffectiveUserId(c);
    if (!userId) return c.json({ logoUrl: "" });

    const { data, error } = await supabase
      .from("user_configs")
      .select("logo_url")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return c.json({ logoUrl: data?.logo_url || "" });
  } catch (error) {
    return c.json({ logoUrl: "" });
  }
});

// Template Config
app.post("/make-server-70a2af89/config/template", async (c) => {
  try {
    const { template } = await c.req.json();
    const user = await getUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { error } = await supabase
      .from("user_configs")
      .upsert({ user_id: user.id, active_template: template }, { onConflict: "user_id" });
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to save template" }, 500);
  }
});

app.get("/make-server-70a2af89/config/template", async (c) => {
  try {
    const userId = await getEffectiveUserId(c);
    if (!userId) return c.json({ template: "fullscreen" });

    const { data, error } = await supabase
      .from("user_configs")
      .select("active_template")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return c.json({ template: data?.active_template || "fullscreen" });
  } catch (error) {
    return c.json({ template: "fullscreen" });
  }
});

// Cycle/Ratio Config
app.post("/make-server-70a2af89/config/cycle", async (c) => {
  try {
    const { contentRatio } = await c.req.json();
    const user = await getUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { error } = await supabase
      .from("user_configs")
      .upsert({ user_id: user.id, cycle_ratio: contentRatio }, { onConflict: "user_id" });
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to save cycle config" }, 500);
  }
});

app.get("/make-server-70a2af89/config/cycle", async (c) => {
  try {
    const userId = await getEffectiveUserId(c);
    if (!userId) return c.json({ contentRatio: 70 });

    const { data, error } = await supabase
      .from("user_configs")
      .select("cycle_ratio")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return c.json({ contentRatio: data?.cycle_ratio !== null && data?.cycle_ratio !== undefined ? data.cycle_ratio : 70 });
  } catch (error) {
    return c.json({ contentRatio: 70 });
  }
});

// Playlist Management Endpoints

// 1. Get all playlists (metadata only)
app.get("/make-server-70a2af89/playlists", async (c) => {
  try {
    const user = await getUser(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const role = user.user_metadata?.role;

    const query = supabase
      .from("playlists")
      .select("id, legacy_id, owner_id, name, created_at");

    const { data, error } = role === 'admin'
      ? await query
      : await query.eq("owner_id", user.id);

    if (error) throw error;

    const playlists = (data || []).map((p: any) => ({
      id: p.legacy_id || p.id,
      ownerId: p.owner_id,
      name: p.name,
      createdAt: p.created_at
    }));

    return c.json({ playlists });
  } catch (error) {
    console.error("Get playlists error:", error);
    return c.json({ playlists: [] });
  }
});

// 2. Create or Update Playlist Index (Smart Merge)
app.post("/make-server-70a2af89/playlists/index", async (c) => {
  try {
    const user = await getUser(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { playlists } = await c.req.json();
    const role = user.user_metadata?.role;
    if (!Array.isArray(playlists)) return c.json({ error: "Invalid payload" }, 400);

    const incoming = playlists.map((p: any) => {
      const ownerId = role === 'admin' ? (p.ownerId || user.id) : user.id;
      const legacyId = p.id ? String(p.id) : null;
      const row: any = {
        legacy_id: legacyId,
        owner_id: ownerId,
        name: p.name || null,
      };
      if (legacyId && isUuid(legacyId)) {
        row.id = legacyId;
      }
      if (p.createdAt) row.created_at = p.createdAt;
      return row;
    });

    const { error: upsertError } = await supabase
      .from("playlists")
      .upsert(incoming, { onConflict: "legacy_id" });
    if (upsertError) throw upsertError;

    return c.json({ success: true });

  } catch (error) {
    console.error("Update index error:", error);
    return c.json({ error: "Failed to update index" }, 500);
  }
});

// 3. Get specific playlist items
app.get("/make-server-70a2af89/playlists/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = await getUser(c);
    
    // Optional: Check ownership if strict security is needed. 
    // For now, let's allow reading if you have the ID, but listing is restricted.

    const playlist = await getPlaylistByExternalId(id);
    if (!playlist) {
      return c.json({ items: [], shuffle: false });
    }

    const items = Array.isArray(playlist.items) ? playlist.items : [];
    const settings = playlist.settings || { shuffle: false };

    return c.json({ items, shuffle: settings.shuffle || false });
  } catch (error) {
    return c.json({ items: [] });
  }
});

// 4. Save specific playlist items
app.post("/make-server-70a2af89/playlists/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json(); // Get full body { items, shuffle }
    const user = await getUser(c);

    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const playlist = await getPlaylistByExternalId(id);

    if (playlist && playlist.owner_id !== user.id && user.user_metadata?.role !== 'admin') {
      return c.json({ error: "Você não tem permissão para editar esta playlist." }, 403);
    }

    const items = body.items || [];
    const settings = body.settings || { shuffle: !!body.shuffle };

    if (playlist) {
      const { error } = await supabase
        .from("playlists")
        .update({ items, settings })
        .eq("id", playlist.id);
      if (error) throw error;
      return c.json({ success: true });
    }

    const { error } = await supabase
      .from("playlists")
      .insert({
        legacy_id: id,
        owner_id: user.id,
        name: "Playlist",
        items,
        settings
      });
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to save playlist" }, 500);
  }
});

// 5. Delete playlist
app.delete("/make-server-70a2af89/playlists/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = await getUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const playlist = await getPlaylistByExternalId(id);
    if (!playlist) return c.json({ success: true });

    if (playlist.owner_id !== user.id && user.user_metadata?.role !== 'admin') {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { error } = await supabase
      .from("playlists")
      .delete()
      .eq("id", playlist.id);
    if (error) throw error;

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete" }, 500);
  }
});

// --- Analytics & Status Endpoints ---

// 1. Player Heartbeat (To track online status)
app.post("/make-server-70a2af89/player/heartbeat", async (c) => {
  try {
    const { uid, currentMedia } = await c.req.json();
    const timestamp = Date.now();
    
    // Check previous status to log connection
    const { data: prevStatus, error: prevStatusError } = await supabase
      .from("player_status")
      .select("last_seen")
      .eq("user_id", uid)
      .maybeSingle();
    if (prevStatusError) throw prevStatusError;
    const lastSeenMs = prevStatus?.last_seen ? new Date(prevStatus.last_seen).getTime() : 0;
    const wasOffline = !prevStatus || (timestamp - lastSeenMs > 5 * 60 * 1000);

    if (wasOffline) {
        // Try to get user name
        const name = await getProfileName(uid);
        const safeName = name || (uid ? `Dispositivo ${uid.substring(0,4)}` : "Dispositivo Anônimo");
        
        await logActivity(`${safeName} conectou-se à rede`, 'tv');
    }

    // Save status with a short TTL logic (we just save the timestamp)
    const { error } = await supabase
      .from("player_status")
      .upsert({
        user_id: uid,
        last_seen: new Date(timestamp).toISOString(),
        current_media: currentMedia || "Desconhecido",
        is_online: true
      }, { onConflict: "user_id" });
    if (error) throw error;
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Heartbeat failed" }, 500);
  }
});

// 2. Track Impression (When an ad plays)
app.post("/make-server-70a2af89/player/impression", async (c) => {
  try {
    const { adId, advertiserId, layout } = await c.req.json();
    
    // Increment global counter (simple implementation)
    // In a real DB we would use atomic increments or a specialized table
    const { data: currentStats, error: statsError } = await supabase
      .from("system_stats")
      .select("value")
      .eq("key", "stats_total_impressions")
      .maybeSingle();
    if (statsError) throw statsError;
    const currentTotal = Number(currentStats?.value || 0);
    const { error: statsUpdateError } = await supabase
      .from("system_stats")
      .upsert({ key: "stats_total_impressions", value: currentTotal + 1 }, { onConflict: "key" });
    if (statsUpdateError) throw statsUpdateError;

    // Log Activity for Share of Voice Calculation
    let finalAdvertiserId = advertiserId;

    // Fallback: Extract from adId if advertiserId is missing or unknown
    // Format: ad-{advertiserId}-{mediaId}-{random}
    if ((!finalAdvertiserId || finalAdvertiserId === 'unknown') && adId && typeof adId === 'string' && adId.startsWith('ad-')) {
        const parts = adId.split('-');
        if (parts.length >= 2) {
            finalAdvertiserId = parts[1];
        }
    }

    if (finalAdvertiserId && finalAdvertiserId !== 'unknown') {
      let advertiserName = "Anunciante Desconhecido";
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("nome_fantasia, razao_social, email")
          .eq("id", finalAdvertiserId)
          .maybeSingle();
        if (profileError) throw profileError;
        advertiserName = profile?.nome_fantasia || profile?.razao_social || profile?.email || advertiserName;
      } catch (lookupError) {
        console.error("Error looking up advertiser name:", lookupError);
      }

      await logActivity(`Anúncio: ${advertiserName}`, 'ad', finalAdvertiserId);
    }

    const { error: impressionError } = await supabase
      .from("ad_impressions")
      .insert({
        advertiser_id: finalAdvertiserId || null,
        ad_ref: adId || null,
        layout: layout || null
      });
    if (impressionError) throw impressionError;
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Impression error:", error);
    return c.json({ success: false }); // Fail silently to not stop player
  }
});

// Helper to log activity
const logActivity = async (
  text: string,
  type: 'media' | 'tv' | 'ad' | 'jukebox',
  advertiserId?: string | null
) => {
  try {
    const { error } = await supabase
      .from("activity_logs")
      .insert({
        message: text,
        type,
        advertiser_id: advertiserId || null
      });
    if (error) throw error;
  } catch (e) {
    console.error("Failed to log activity", e);
  }
};

// --- Jukebox Request Endpoint ---
app.post("/make-server-70a2af89/jukebox/request", async (c) => {
    try {
        const body = await c.req.json();
        const title = body.title || "Música desconhecida";
        const user = await getUser(c);
        const fallbackUserId = body.userId || c.req.query('uid') || null;
        const targetUserId = user?.id || (fallbackUserId && isUuid(fallbackUserId) ? fallbackUserId : null);
        
        // Log to activity stream
        await logActivity(`Jukebox: ${title}`, 'jukebox');

        const { error: jukeboxInsertError } = await supabase
          .from("jukebox_requests")
          .insert({
            user_id: targetUserId,
            title
          });
        if (jukeboxInsertError) throw jukeboxInsertError;

        const { data: currentStats, error: statsError } = await supabase
          .from("system_stats")
          .select("value")
          .eq("key", "stats_jukebox_requests")
          .maybeSingle();
        if (statsError) throw statsError;
        const currentTotal = Number(currentStats?.value || 0);
        const { error: statsUpdateError } = await supabase
          .from("system_stats")
          .upsert({ key: "stats_jukebox_requests", value: currentTotal + 1 }, { onConflict: "key" });
        if (statsUpdateError) throw statsUpdateError;

        // Update Daily Stats for Chart
        // Use BRT (UTC-3) to ensure late night requests count for the correct local day
        const now = new Date();
        const brTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        const today = brTime.toISOString().split('T')[0];

        try {
            const { data: dailyRow, error: dailyError } = await supabase
              .from("jukebox_stats_daily")
              .select("count")
              .eq("day", today)
              .maybeSingle();
            if (dailyError) throw dailyError;

            const count = Number(dailyRow?.count || 0) + 1;
            const { error: upsertError } = await supabase
              .from("jukebox_stats_daily")
              .upsert({ day: today, count }, { onConflict: "day" });
            if (upsertError) throw upsertError;

            console.log(`[Jukebox] Stats updated for ${today}: ${count}`);
        } catch (statsError) {
            console.error("[Jukebox] Critical error updating stats:", statsError);
            // We do NOT rethrow here, so the user still gets a success response for the music request
            // But we log it heavily for debugging.
        }

        return c.json({ success: true });
    } catch (e) {
        console.error("Jukebox log error", e);
        return c.json({ success: false }, 500);
    }
});

// --- Dashboard Stats Endpoint ---

app.get("/make-server-70a2af89/dashboard/stats", async (c) => {
  try {
    const user = await getUser(c);
    let userRole: string | null = user?.user_metadata?.role || null;
    if (user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role) userRole = profile.role;
    }

    const isClient =
      !!user?.id && userRole !== "admin" && userRole !== "advertiser";

    if (user?.id && isClient) {
      const clientId = user.id;
      const since = new Date();
      since.setDate(since.getDate() - 6);
      const sinceIso = new Date(
        Date.UTC(since.getFullYear(), since.getMonth(), since.getDate(), 0, 0, 0)
      ).toISOString();

      const [jukeboxCountRow, jukeboxRows] = await Promise.all([
        supabase
          .from("jukebox_requests")
          .select("*", { count: "exact", head: true })
          .eq("user_id", clientId),
        supabase
          .from("jukebox_requests")
          .select("title, created_at")
          .eq("user_id", clientId)
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .limit(200)
      ]);

      const recentActivity = (jukeboxRows.data || [])
        .slice(0, 50)
        .map((row: any) => ({
          text: `Jukebox: ${row.title}`,
          type: "jukebox",
          time: row.created_at ? new Date(row.created_at).getTime() : Date.now()
        }));

      const jukeboxHistory: Record<string, number> = {};
      (jukeboxRows.data || []).forEach((row: any) => {
        const dateKey = row.created_at
          ? new Date(row.created_at).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        jukeboxHistory[dateKey] = (jukeboxHistory[dateKey] || 0) + 1;
      });

      return c.json({
        onlineTvs: 0,
        totalClients: 0,
        onlineDevicesList: [],
        mediaCount: 0,
        activeAdvertisersCount: 0,
        totalAdsDisplayed: 0,
        jukeboxRequests: jukeboxCountRow.count || 0,
        jukeboxHistory,
        estimatedEarnings: 0,
        recentActivity
      });
    }

    const onlineThreshold = new Date(Date.now() - (60 * 1000)).toISOString();

    const [
      impressionsRow,
      jukeboxRow,
      activityRows,
      mediaCountRow,
      advertiserCountRow,
      clientCountRow,
      onlineRows,
      jukeboxDailyRows
    ] = await Promise.all([
      supabase.from("system_stats").select("value").eq("key", "stats_total_impressions").maybeSingle(),
      supabase.from("system_stats").select("value").eq("key", "stats_jukebox_requests").maybeSingle(),
      supabase.from("activity_logs").select("message, type, created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("media_items").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "advertiser"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
      supabase.from("player_status").select("user_id, last_seen, current_media").gt("last_seen", onlineThreshold),
      supabase.from("jukebox_stats_daily").select("day, count").order("day", { ascending: true })
    ]);

    const totalImpressions = Number(impressionsRow.data?.value || 0);
    const totalJukebox = Number(jukeboxRow.data?.value || 0);
    const recentActivity = (activityRows.data || []).map((row: any) => ({
      text: row.message,
      type: row.type,
      time: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    }));

    const onlineStatuses = onlineRows.data || [];
    const onlineDevices: any[] = [];

    const onlineUserIds = onlineStatuses.map((row: any) => row.user_id);
    let profileMap = new Map<string, string>();
    if (onlineUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome_fantasia, razao_social, email")
        .in("id", onlineUserIds);
      profileMap = new Map((profiles || []).map((p: any) => [
        p.id,
        p.nome_fantasia || p.razao_social || p.email || `Dispositivo ${p.id.substring(0, 4)}`
      ]));
    }

    onlineStatuses.forEach((status: any) => {
      const name = profileMap.get(status.user_id) || `Dispositivo ${status.user_id.substring(0, 4)}`;
      onlineDevices.push({
        id: status.user_id,
        name,
        currentMedia: status.current_media,
        lastSeen: new Date(status.last_seen).getTime()
      });
    });

    const jukeboxHistory: Record<string, number> = {};
    (jukeboxDailyRows.data || []).forEach((row: any) => {
      jukeboxHistory[row.day] = row.count;
    });

    const mediaCount = mediaCountRow.count || 0;
    const activeAdvertisersCount = advertiserCountRow.count || 0;
    const totalClients = clientCountRow.count || 0;

    const adsDisplayed = totalImpressions || 0;

    return c.json({
        onlineTvs: onlineDevices.length,
        totalClients: totalClients,
        onlineDevicesList: onlineDevices,
        mediaCount: mediaCount,
        activeAdvertisersCount,
        totalAdsDisplayed: adsDisplayed,
        jukeboxRequests: totalJukebox || 0,
        jukeboxHistory,
        estimatedEarnings: activeAdvertisersCount * 200, // Mock formula
        recentActivity: recentActivity
    });

  } catch (error) {
    console.error("Dashboard stats error:", error);
    return c.json({ 
        onlineTvs: 0,
        totalClients: 0,
        onlineDevicesList: [],
        mediaCount: 0, 
        activeAdvertisersCount: 0, 
        totalAdsDisplayed: 0,
        jukeboxRequests: 0,
        jukeboxHistory: {},
        estimatedEarnings: 0
    });
  }
});

// --- Media Library Endpoints ---

// 1. Get Upload Token (Signed URL for Client Upload)
app.post("/make-server-70a2af89/media/upload-token", async (c) => {
  try {
    const { filename } = await c.req.json();
    const path = `${Date.now()}_${filename}`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(path);

    if (error) throw error;

    return c.json({ 
      token: data.token, 
      path: data.path,
      signedUrl: data.signedUrl 
    });
  } catch (error) {
    console.error("Upload token error:", error);
    return c.json({ error: "Failed to generate upload token" }, 500);
  }
});

// 2. Get Media Library (Metadata + Signed URLs)
app.get("/make-server-70a2af89/media", async (c) => {
  try {
    const { data, error } = await supabase
      .from("media_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const signedMedia = await Promise.all((data || []).map(async (item: any) => {
      const normalized = {
        ...item,
        ownerId: item.owner_id,
        uploadedAt: item.metadata?.uploadedAt || item.created_at,
      };
      return await signMediaUrl(normalized);
    }));

    return c.json({ media: signedMedia });
  } catch (error) {
    return c.json({ media: [] });
  }
});

// 3. Save Media Metadata
app.post("/make-server-70a2af89/media", async (c) => {
  try {
    const { mediaItem } = await c.req.json();
    if (!mediaItem) return c.json({ error: "Missing media item" }, 400);

    const legacyId = mediaItem.id ? String(mediaItem.id) : null;
    const id = legacyId && isUuid(legacyId) ? legacyId : crypto.randomUUID();

    const { error } = await supabase
      .from("media_items")
      .insert({
        id,
        legacy_id: legacyId,
        owner_id: mediaItem.ownerId || null,
        title: mediaItem.title || null,
        url: mediaItem.url || null,
        path: mediaItem.path || null,
        type: mediaItem.type || null,
        duration: mediaItem.duration ?? null,
        layout: mediaItem.layout || null,
        metadata: {
          ...mediaItem.metadata,
          size: mediaItem.size,
          uploadedAt: mediaItem.uploadedAt
        }
      });
    if (error) throw error;

    // Log Activity
    await logActivity(`Nova mídia adicionada: ${mediaItem.title || 'Sem título'}`, 'media');
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to save media metadata" }, 500);
  }
});

// 4. Delete Media
app.delete("/make-server-70a2af89/media/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const query = supabase.from("media_items").select("*");
    const { data: itemToDelete, error: itemError } = await (isUuid(id)
      ? query.eq("id", id).maybeSingle()
      : query.eq("legacy_id", id).maybeSingle());
    if (itemError) throw itemError;

    if (itemToDelete && itemToDelete.path) {
      // Delete from Storage
      await supabase.storage.from(BUCKET_NAME).remove([itemToDelete.path]);
    }

    if (itemToDelete) {
      const { error } = await supabase
        .from("media_items")
        .delete()
        .eq("id", itemToDelete.id);
      if (error) throw error;
    }
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete media" }, 500);
  }
});

// --- Proxy Endpoint for RSS ---
app.get("/make-server-70a2af89/proxy/rss", async (c) => {
  try {
    const url = c.req.query("url");
    if (!url) {
      return c.text("Missing url param", 400);
    }

    // Simple fetch without extensive validation (for now)
    const response = await fetch(url);
    if (!response.ok) {
      return c.text("Failed to fetch external RSS", 502);
    }

    const xml = await response.text();
    
    // Return XML with correct headers
    return c.text(xml, 200, {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=300" // Cache for 5 minutes
    });
  } catch (error) {
    console.error("RSS Proxy Error:", error);
    return c.text("Internal Server Error", 500);
  }
});

// --- User Management Endpoints ---

// 1. Get All Users
app.get("/make-server-70a2af89/users", async (c) => {
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, role, nome_fantasia, razao_social, logo_url, logo_path, status, created_at");
    if (profilesError) throw profilesError;

    const { data: playlists, error: playlistsError } = await supabase
      .from("playlists")
      .select("owner_id, items");
    if (playlistsError) throw playlistsError;

    const { data: ads, error: adsError } = await supabase
      .from("ads")
      .select("advertiser_id");
    if (adsError) throw adsError;

    const playlistCountMap = new Map<string, number>();
    (playlists || []).forEach((pl: any) => {
      const count = Array.isArray(pl.items) ? pl.items.length : 0;
      playlistCountMap.set(pl.owner_id, (playlistCountMap.get(pl.owner_id) || 0) + count);
    });

    const adsCountMap = new Map<string, number>();
    (ads || []).forEach((ad: any) => {
      if (!ad.advertiser_id) return;
      adsCountMap.set(ad.advertiser_id, (adsCountMap.get(ad.advertiser_id) || 0) + 1);
    });

    const signedUsers = await Promise.all((profiles || []).map(async (u: any) => {
      let logoUrl = u.logo_url || null;
      if (!logoUrl && u.logo_path) {
        const { data } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(u.logo_path, 3600);
        if (data?.signedUrl) logoUrl = data.signedUrl;
      }
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        nomeFantasia: u.nome_fantasia,
        razaoSocial: u.razao_social,
        name: u.nome_fantasia || u.razao_social || u.email,
        logoUrl,
        status: u.status,
        active: u.status !== 'inactive',
        createdAt: u.created_at,
        mediaCount: u.role === 'advertiser' ? (adsCountMap.get(u.id) || 0) : (playlistCountMap.get(u.id) || 0)
      };
    }));

    return c.json({ users: signedUsers });
  } catch (error) {
    console.error("Failed to list users:", error);
    return c.json({ users: [] });
  }
});

// 2. Create User
app.post("/make-server-70a2af89/users", async (c) => {
  try {
    const { email, password, role, ...profileData } = await c.req.json();
    
    if (!email || !password || !role) {
      return c.json({ error: "Email, password, and role are required" }, 400);
    }

    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
         return c.json({ error: "Formato de e-mail inválido." }, 400);
    }

    // 1. Create in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { role, ...profileData }
    });

    let userId = authData?.user?.id;

    if (authError) {
      // Handle "User already exists" to allow syncing KV with Auth (e.g. if deleted from KV but not Auth)
      if (authError.code === "email_exists" || authError.message?.includes("already been registered")) {
        console.log(`Email ${cleanEmail} exists in Auth. Attempting recovery...`);
        
        // Try to find the user in Auth to get their ID
        const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const existingUser = userList?.users.find(u => u.email?.toLowerCase() === cleanEmail.toLowerCase());
        
        if (existingUser) {
          userId = existingUser.id;
          // Note: Password is NOT updated here. 
          // If the user wanted to change password, they should use the edit flow or password reset.
        } else {
           // Should not happen if error was email_exists, but safe fallback
           return c.json({ error: "Este e-mail já está registrado (Auth), mas não foi possível recuperar os dados." }, 400);
        }
      } else {
        console.error("Auth creation failed:", authError);
        return c.json({ error: authError.message }, 400);
      }
    }

    const newUser = {
      id: userId!,
      email: cleanEmail,
      role,
      status: 'active',
      nome_fantasia: profileData.nomeFantasia || profileData.nome_fantasia || profileData.name || null,
      razao_social: profileData.razaoSocial || profileData.razao_social || null,
      logo_url: profileData.logoUrl || profileData.logo_url || null,
      logo_path: profileData.logoPath || profileData.logo_path || null
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(newUser, { onConflict: "id" });
    if (profileError) throw profileError;

    return c.json({ success: true, user: newUser });
  } catch (error) {
    console.error("Create user error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// 3. Update User
app.patch("/make-server-70a2af89/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();

    // Update Auth Metadata (Role Sync Fix)
    if (updates.role || updates.email || updates.password || updates.active !== undefined) {
         const authUpdates: any = {};
         
         if (updates.email) authUpdates.email = updates.email;
         if (updates.password) authUpdates.password = updates.password;
         
         // Update metadata (role, name, etc)
         // We merge existing metadata with updates to avoid losing data
         const { data: userAuth } = await supabase.auth.admin.getUserById(id);
         const currentMeta = userAuth?.user?.user_metadata || {};
         
         authUpdates.user_metadata = {
             ...currentMeta,
             ...updates
         };
         
         // If updating active status to false, we might want to ban user, but let's keep it simple.
         // Just updating metadata is enough for our logic (role check).

         const { error: authError } = await supabase.auth.admin.updateUserById(id, authUpdates);
         
         if (authError) {
             console.error("Failed to sync Auth update:", authError);
             // We continue to update KV so local state is correct at least
         }
    }

    const profileUpdates = {
      email: updates.email,
      role: updates.role,
      status: updates.active === false ? 'inactive' : updates.active === true ? 'active' : undefined,
      nome_fantasia: updates.nomeFantasia || updates.nome_fantasia,
      razao_social: updates.razaoSocial || updates.razao_social,
      logo_url: updates.logoUrl || updates.logo_url,
      logo_path: updates.logoPath || updates.logo_path
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update(profileUpdates)
      .eq("id", id);
    if (updateError) throw updateError;

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Update failed" }, 500);
  }
});

// 4. Delete User
app.delete("/make-server-70a2af89/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    // 1. Delete from Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      console.error("Auth delete failed:", authError);
      // Continue to delete from KV anyway to keep state clean
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id);
    if (profileError) throw profileError;

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Delete failed" }, 500);
  }
});

Deno.serve(app.fetch);
