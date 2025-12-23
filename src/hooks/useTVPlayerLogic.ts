import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseUrl, publicAnonKey } from "../utils/supabase/info";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { PlaylistItem } from "../types/player";

export function useTVPlayerLogic() {
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rssUrl, setRssUrl] = useState("https://www.cnnbrasil.com.br/feed/");
  const [logoUrl, setLogoUrl] = useState(""); 
  const [activeTemplate, setActiveTemplate] = useState<'fullscreen' | 'l-bar' | 'menu-board' | 'events' | 'split'>('fullscreen');
  const [sideAds, setSideAds] = useState<any[]>([]); 
  const [adQueue, setAdQueue] = useState<any[]>([]); 
  const [contentRatio, setContentRatio] = useState(70); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestQueue, setRequestQueue] = useState<string[]>([]); 

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTicker, setShowTicker] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  const visualAds = useMemo(() => sideAds.filter(a => a.layout !== 'stripe'), [sideAds]);
  const [layoutMode, setLayoutMode] = useState<'auto' | 'fullscreen' | 'l-bar'>('auto');
  const [shuffleQueue, setShuffleQueue] = useState<number[]>([]);
  
  // Refs
  const requestQueueRef = useRef<string[]>([]);
  const playlistRef = useRef<PlaylistItem[]>([]);
  const toggleShuffleRef = useRef<() => void>(() => {});
  const channelRef = useRef<any>(null);
  const handleNextRef = useRef<() => void>(() => {});
  const loadDataRef = useRef<() => void>(() => {});
  const prevAdsRef = useRef<string>("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const currentIndexRef = useRef(currentIndex);
  
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  
  // Sync Refs
  useEffect(() => {
    requestQueueRef.current = requestQueue;
  }, [requestQueue]);
  
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);
  
  const queryParams = new URLSearchParams(window.location.search);
  const [urlUid] = useState(queryParams.get("uid") || "");
  const [sessionUid, setSessionUid] = useState("");
  
  useEffect(() => {
      if (!urlUid) {
          supabase.auth.getSession().then(({ data: { session } }) => {
              if (session?.user?.id) setSessionUid(session.user.id);
          });
      }
  }, [urlUid]);

  const userId = urlUid || sessionUid; 

  const [isCurrentRequest, setIsCurrentRequest] = useState(false); 
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [displayedTemplate, setDisplayedTemplate] = useState<'fullscreen' | 'l-bar'>('fullscreen');

  const currentAd = adQueue.length > 0 ? adQueue[currentAdIndex] : sideAds[0];
  const isAdFullscreen = displayedTemplate === 'l-bar' && currentAd?.layout === 'fullscreen';

  const isCurrentAdVideo = useMemo(() => {
    if (!currentAd) return false;
    if (currentAd.type === 'video' || currentAd.type === 'youtube') return true;
    if (currentAd.type === 'image') return false;
    if (currentAd.url && /\.(mp4|webm|ogg|mov|m4v)($|\?)/i.test(currentAd.url)) return true;
    if (currentAd.url && (currentAd.url.includes('youtube.com') || currentAd.url.includes('youtu.be'))) return true;
    return false;
  }, [currentAd]);

  const currentItem = playlist[currentIndex];

  // Cycle Logic
  useEffect(() => {
      if (layoutMode === 'fullscreen') {
          if (displayedTemplate !== 'fullscreen') setDisplayedTemplate('fullscreen');
          return;
      }
      
      if (layoutMode === 'l-bar') {
           if (displayedTemplate !== 'l-bar') {
               if (visualAds.length > 0 && adQueue.length === 0) {
                    setAdQueue(visualAds); 
                    setCurrentAdIndex(0);
               }
               setDisplayedTemplate('l-bar');
           }
           return;
      }

      let timer: any;

      if (displayedTemplate === 'fullscreen') {
          if (visualAds.length === 0) return;

          const shuffled = [...visualAds].sort(() => 0.5 - Math.random());
          const nextBatch = shuffled.slice(0, 2);
          
          const totalAdDuration = nextBatch.reduce((acc: number, ad: any) => acc + (ad.duration || 15), 0);
          
          const cRatio = contentRatio / 100;
          const aRatio = 1 - cRatio;
          const safeAdRatio = aRatio <= 0 ? 0.01 : aRatio; 

          const contentDuration = totalAdDuration > 0 
              ? (totalAdDuration / safeAdRatio) * cRatio 
              : 30;

          timer = setTimeout(() => {
              setAdQueue(nextBatch);
              setCurrentAdIndex(0);
              setDisplayedTemplate('l-bar');
          }, contentDuration * 1000);

      } 

      return () => clearTimeout(timer);
  }, [displayedTemplate, visualAds, contentRatio, layoutMode, adQueue.length]);

  // Ad Rotation Logic
  useEffect(() => {
      if (displayedTemplate !== 'l-bar') return;

      if (layoutMode === 'l-bar') {
          if (adQueue.length === 0) {
              if (visualAds.length > 0) {
                  setAdQueue([...visualAds].sort(() => 0.5 - Math.random()));
                  setCurrentAdIndex(0);
              }
              return;
          }

          const ad = adQueue[currentAdIndex];
          const duration = (ad?.duration || 15) * 1000;
          
          const timer = setTimeout(() => {
              if (currentAdIndex < adQueue.length - 1) {
                  setCurrentAdIndex(prev => prev + 1);
              } else {
                  const nextQueue = [...visualAds].sort(() => 0.5 - Math.random());
                  setAdQueue(nextQueue);
                  setCurrentAdIndex(0);
              }
          }, duration);
          return () => clearTimeout(timer);
      }

      if (adQueue.length === 0) {
          setDisplayedTemplate('fullscreen');
          return;
      }

      const ad = adQueue[currentAdIndex];
      const duration = (ad?.duration || 15) * 1000;

      const timer = setTimeout(() => {
          if (currentAdIndex < adQueue.length - 1) {
              setCurrentAdIndex(prev => prev + 1);
          } else {
              setDisplayedTemplate('fullscreen');
          }
      }, duration);

      return () => clearTimeout(timer);
  }, [displayedTemplate, currentAdIndex, adQueue, layoutMode, visualAds]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullScreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  const handleExit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => console.error("Exit fullscreen error:", err));
    }
    // Navigate back to the previous page (Dashboard) instead of root which might be the landing page
    navigate(-1);
  }, [navigate]);

  // Realtime
  const playerStateRef = useRef({
      isPlaying: true,
      isMuted: true,
      currentIndex: 0,
      layoutMode: 'auto' as 'auto' | 'fullscreen' | 'l-bar',
      showTicker: true,
      currentId: null as string | null
  });

  useEffect(() => {
      const newState = {
          isPlaying,
          isMuted,
          isShuffle,
          currentIndex,
          layoutMode,
          showTicker,
          currentId: playlist[currentIndex]?.id || null
      };
      playerStateRef.current = newState;

      if (channelRef.current) {
          channelRef.current.send({
              type: 'broadcast',
              event: 'status_update',
              payload: {
                  ...newState,
                  queue: requestQueueRef.current
              }
          }).catch((err: any) => console.error("Broadcast failed", err));
      }
  }, [isPlaying, isMuted, isShuffle, currentIndex, layoutMode, showTicker, playlist]);

  useEffect(() => {
      const channelName = userId ? `tv-control-${userId}` : 'tv-control';
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false, ack: true },
          presence: { key: 'tv-player' }
        }
      });
      channelRef.current = channel;
      
      channel
      .on('broadcast', { event: 'get_status' }, () => {
          console.log("Status Request Received");
          channel.send({
              type: 'broadcast',
              event: 'status_update',
              payload: {
                  ...playerStateRef.current,
                  queue: requestQueueRef.current
              }
          }).catch((err: any) => console.error("Status reply failed", err));
      })
      .on('broadcast', { event: 'request_video' }, (payload) => {
          if (payload.payload?.id) {
              console.log("Remote Request Received:", payload.payload);
              setRequestQueue(prev => (prev.includes(payload.payload.id) ? prev : [...prev, payload.payload.id]));
              toast.info(`Adicionado à fila: ${payload.payload.title || 'Vídeo solicitado'}`, {
                  position: 'top-right',
                  duration: 5000
              });
          }
      })
      .on('broadcast', { event: 'get_queue_status' }, () => {
          channel.send({
              type: 'broadcast',
              event: 'queue_update',
              payload: { queue: requestQueueRef.current }
          }).catch((err: any) => console.error("Broadcast failed", err));
      })
      .on('broadcast', { event: 'control_command' }, ({ payload }) => {
          console.log("Control Command Received:", payload);
          toast.info(`Comando Recebido: ${payload.action}`, { duration: 2000, position: 'bottom-right' });
          
          switch (payload.action) {
              case 'PLAY': setIsPlaying(true); break;
              case 'PAUSE': setIsPlaying(false); break;
              case 'NEXT':
                 setIsPlaying(true);
                 handleNextRef.current();
                 break;
              case 'PREV': 
                 setCurrentIndex(curr => {
                     const len = playlistRef.current.length;
                     if (len === 0) return 0;
                     return (curr - 1 + len) % len;
                 });
                 break;
              case 'TOGGLE_MUTE': setIsMuted(m => !m); break;
              case 'SET_VOLUME': 
                 if (payload.volume === 0) setIsMuted(true);
                 else setIsMuted(false);
                 break;
              case 'JUMP_TO':
                 if (payload.id) {
                     const idx = playlistRef.current.findIndex(p => p.id === payload.id);
                     if (idx !== -1) setCurrentIndex(idx);
                 }
                 break;
              case 'REMOVE_FROM_QUEUE':
                 if (typeof payload.index === 'number') {
                     setRequestQueue(q => q.filter((_, i) => i !== payload.index));
                 }
                 break;
              case 'CLEAR_QUEUE':
                 setRequestQueue([]);
                 break;
              case 'RELOAD':
                 toast.info("Atualizando conteúdo...", { position: "top-center" });
                 loadDataRef.current();
                 break;
              case 'TOGGLE_TICKER':
                 setShowTicker(prev => !prev);
                 break;
              case 'TOGGLE_SHUFFLE':
                 toggleShuffleRef.current();
                 break;
              case 'TOGGLE_LAYOUT':
                 setLayoutMode(prev => {
                     const nextMode = prev === 'auto' ? 'fullscreen' : prev === 'fullscreen' ? 'l-bar' : 'auto';
                     const msg = nextMode === 'auto' ? "Modo Automático" : nextMode === 'fullscreen' ? "Modo Apenas Conteúdo" : "Modo Anúncios Fixos";
                     toast.info(msg, { position: "top-center" });
                     return nextMode;
                 });
                 break;
          }
      })
      .subscribe(async (status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
            console.log(`Connected to Realtime Channel: ${channelName}`);
            await channel.track({ online_at: new Date().toISOString() });
        }
      });

      return () => {
          supabase.removeChannel(channel);
          channelRef.current = null;
          setIsSubscribed(false);
      };
  }, []);

  useEffect(() => {
      if (channelRef.current && isSubscribed) {
          channelRef.current.send({
              type: 'broadcast',
              event: 'queue_update',
              payload: { queue: requestQueue }
          }).catch((err: any) => console.error("Broadcast error", err));
      }
  }, [requestQueue, isSubscribed]);

  useEffect(() => {
    const sendHeartbeat = async () => {
        try {
            await fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/player/heartbeat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({ 
                    uid: userId, 
                    currentMedia: playlistRef.current[currentIndex]?.title || 'Desconhecido'
                })
            });
        } catch (e) { }
    };

    sendHeartbeat();
    const interval = setInterval(() => {
        sendHeartbeat();
        if (!channelRef.current) return;
        const currentId = playlistRef.current[currentIndex]?.id;
        channelRef.current.send({
            type: 'broadcast',
            event: 'status_update',
            payload: {
                isPlaying,
                isMuted,
                currentId,
                currentIndex,
                queue: requestQueueRef.current,
                layoutMode,
                showTicker
            }
        });
    }, 30000);
    return () => clearInterval(interval);
  }, [isPlaying, isMuted, currentIndex, layoutMode, showTicker, userId]);

  useEffect(() => {
      if (!currentItem) return;
      
      const trackImpression = async () => {
         try {
             if (currentItem.type === 'ad' || true) { 
                 await fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/player/impression`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${publicAnonKey}`
                    },
                    body: JSON.stringify({ 
                        adId: currentItem.id, 
                        advertiserId: (currentItem as any).advertiserId || 'unknown', 
                        layout: activeTemplate
                    })
                 });
             }
         } catch (e) {
             console.error("Impression failed", e);
         }
      };
      trackImpression();
  }, [currentItem?.id]);

  const loadData = useCallback(async () => {
    setIsLoading(prev => playlist.length === 0 ? true : prev);
    
    try {
        const query = userId ? `?uid=${userId}` : '';
        const [plRes, tplRes, adsRes, logoRes, cycleRes, newsRes] = await Promise.all([
           fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/playlist/active${query}`, { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }),
           fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/template${query}`, { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }),
           fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/advertisers${query}`, { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }),
           fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/logo${query}`, { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }),
           fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/cycle${query}`, { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }),
           fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/news${query}`, { headers: { 'Authorization': `Bearer ${publicAnonKey}` } })
        ]);
        
        const plData = await plRes.json();
        const tplData = await tplRes.json();
        const adsData = await adsRes.json();
        const logoData = await logoRes.json();
        const cycleData = await cycleRes.json();
        const newsData = await newsRes.json();

        // Load Shuffle Setting
        const initialShuffle = plData.settings?.shuffle || false;
        if (initialShuffle !== isShuffle) {
             setIsShuffle(initialShuffle);
        }

        const currentTemplate = tplData.template || 'fullscreen';
        setActiveTemplate(currentTemplate);
        if (cycleData.contentRatio !== undefined) setContentRatio(cycleData.contentRatio);
        setRssUrl(newsData.rssUrl || "https://www.cnnbrasil.com.br/feed/");

        const allAdsMedia: any[] = [];
        const adUrls = new Set<string>();
        const adIds = new Set<string>();

        if (adsData.advertisers && Array.isArray(adsData.advertisers)) {
           adsData.advertisers.forEach((ad: any) => {
             if (ad.media && Array.isArray(ad.media)) {
               ad.media.forEach((m: any) => {
                 if (m.url) adUrls.add(m.url);
                 if (m.id) adIds.add(m.id);

                 const layout = (m.layout || 'all').toLowerCase();
                 const isCompatible = 
                   layout === 'all' || 
                   ['sidebar', 'vertical', 'portrait', 'stripe', 'fullscreen'].includes(layout);

                 if (isCompatible) {
                   allAdsMedia.push({ ...m, layout });
                 }
               });
             }
           });
           
           const newAdsStr = JSON.stringify(allAdsMedia);
           if (newAdsStr !== prevAdsRef.current) {
               setSideAds(allAdsMedia);
               prevAdsRef.current = newAdsStr;
           }
        }

        if (plData.playlist && Array.isArray(plData.playlist)) {
           const validItems = plData.playlist.filter((i: any) => {
             if (!i.url) return false;
             // STRICT FILTERS:
             // 1. Explicitly exclude 'ad' type
             if (i.type === 'ad') return false;
             // 2. Allow only specific content types
             if (!['video', 'image', 'youtube'].includes(i.type)) return false;
             // 3. Safety check: Exclude items with advertiser_id just in case backend mixes them up
             if (i.advertiser_id || i.advertiserId) return false; 
             
             return true;
           });
           
           setPlaylist(prev => {
               const isDifferent = prev.length !== validItems.length || 
                                   (validItems.length > 0 && prev.length > 0 && validItems[0].id !== prev[0].id) ||
                                   JSON.stringify(prev.map(p => p.id)) !== JSON.stringify(validItems.map(p => p.id));
               
               if (isDifferent) {
                   // Reset shuffle queue when playlist changes significantly
                   setShuffleQueue([]);

                   // Try to preserve current playing item
                   if (prev.length > 0) {
                       const currentId = prev[currentIndexRef.current]?.id;
                       if (currentId) {
                           const newIndex = validItems.findIndex(item => item.id === currentId);
                           if (newIndex !== -1) {
                               setCurrentIndex(newIndex);
                               return validItems;
                           }
                       }
                   }

                   // If preservation failed (item removed) or it's a new playlist, reset
                   if (initialShuffle && validItems.length > 0) {
                       setCurrentIndex(Math.floor(Math.random() * validItems.length));
                   } else {
                       setCurrentIndex(0); 
                   }
                   return validItems;
               }
               return prev;
           });
        } else {
            setPlaylist([]);
        }
        
        if (logoData.logoUrl) setLogoUrl(logoData.logoUrl);

    } catch (err) {
        console.error("Init failed", err);
        setError("Falha ao carregar dados. Verifique a conexão.");
    } finally {
        setIsLoading(false);
    }
  }, [userId, playlist.length]);

  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  useEffect(() => {
    loadData();
    const pollInterval = setInterval(loadData, 60000);
    return () => clearInterval(pollInterval);
  }, [loadData]);

  const handleNext = useCallback(() => {
    if (playlist.length === 0) return;
    setIsPlaying(true);

    if (requestQueue.length > 0) {
        const nextId = requestQueue[0];
        const requestedIndex = playlist.findIndex(p => p.id === nextId);

        const newQueue = requestQueue.slice(1);
        setRequestQueue(newQueue);

        if (requestedIndex !== -1) {
            setCurrentIndex(requestedIndex);
            setIsCurrentRequest(true);
            return;
        } 
    }

    setIsCurrentRequest(false);

    if (isShuffle && playlist.length > 1) {
      let queue = [...shuffleQueue];
      
      // Filter out invalid indices in case playlist shrank
      queue = queue.filter(idx => idx < playlist.length);

      if (queue.length === 0) {
          // Generate new shuffled deck
          const indices = Array.from({ length: playlist.length }, (_, i) => i);
          
          // Fisher-Yates shuffle
          for (let i = indices.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [indices[i], indices[j]] = [indices[j], indices[i]];
          }
          
          // Avoid immediate repetition if possible (swap first item if it matches current)
          if (indices[0] === currentIndex && playlist.length > 1) {
               const swapIdx = indices.length - 1;
               [indices[0], indices[swapIdx]] = [indices[swapIdx], indices[0]];
          }
          
          queue = indices;
      }
      
      // Smart Resume: Prevent immediate repeat if the next item matches the one just played (e.g. via Jukebox)
      if (queue.length > 0 && queue[0] === currentIndex && playlist.length > 1) {
          const deferred = queue.shift();
          if (deferred !== undefined) queue.push(deferred);
      }
      
      const nextIndex = queue.shift();
      setShuffleQueue(queue);
      
      if (nextIndex !== undefined) {
          setCurrentIndex(nextIndex);
      }
    } else {
      setCurrentIndex((prev) => (prev + 1) % playlist.length);
    }
  }, [playlist, isShuffle, currentIndex, requestQueue, shuffleQueue]);

  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);
  
  const handleUnmuteFailed = useCallback(() => {
      setIsMuted(true);
      toast.error("Toque na tela para ativar o som", {
          duration: 5000,
          position: 'top-center',
          style: { background: 'red', color: 'white', border: 'none' }
      });
  }, []);

  const toggleShuffle = useCallback(() => {
      setIsShuffle(prev => !prev);
      toast.info(isShuffle ? "Modo Sequencial" : "Modo Aleatório", { position: "top-center" });
  }, [isShuffle]);

  useEffect(() => {
    toggleShuffleRef.current = toggleShuffle;
  }, [toggleShuffle]);

  const cycleLayoutMode = useCallback(() => {
      setLayoutMode(prev => {
          const nextMode = prev === 'auto' ? 'fullscreen' : prev === 'fullscreen' ? 'l-bar' : 'auto';
          const msg = nextMode === 'auto' ? "Modo Automático" : nextMode === 'fullscreen' ? "Modo Apenas Conteúdo" : "Modo Anúncios Fixos";
          toast.info(msg, { position: "top-center" });
          return nextMode;
      });
  }, []);

  const handleInteraction = useCallback(() => {
      setHasInteracted(true);
      setIsMuted(false);
      
      // Try to force fullscreen on interaction if not already
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
      }
  }, []);

  return {
    playlist,
    currentIndex,
    currentItem: playlist[currentIndex],
    rssUrl,
    logoUrl,
    activeTemplate,
    isLoading,
    error,
    isPlaying,
    isMuted,
    isShuffle,
    isFullscreen,
    showTicker,
    hasInteracted,
    layoutMode,
    isCurrentRequest,
    currentAd,
    isAdFullscreen,
    isCurrentAdVideo,
    displayedTemplate,
    userId,
    
    handleNext,
    handleExit,
    toggleFullscreen,
    toggleShuffle,
    cycleLayoutMode,
    setShowTicker,
    setIsMuted,
    handleUnmuteFailed,
    handleInteraction,
    currentAdIndex
  };
}
