import { useState, useEffect, useMemo, useRef } from "react";
import { supabaseUrl, publicAnonKey } from "../utils/supabase/info";
import { supabase } from "../utils/supabase/client";
import { Loader2, Music, CheckCircle, Tv, Play, Search, Disc, Mic2, Sparkles, Maximize, Minimize, ListMusic, MonitorPlay, Wifi, WifiOff, Home, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner@2.0.3";

export default function RequestRemote() {
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestSent, setRequestSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [queue, setQueue] = useState<string[]>([]);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  
  // Connection Status
  const [isConnected, setIsConnected] = useState(false);
  const [isPlayerActive, setIsPlayerActive] = useState(false);
  const lastHeartbeat = useRef<number>(0);
  
  // Extract user ID from URL
  const queryParams = new URLSearchParams(window.location.search);
  const userId = queryParams.get("uid") || "";
  const cooldownKey = `jukebox_cooldown_${userId || "global"}`;
  const cooldownMinutes = 30;
  const cooldownMs = cooldownMinutes * 60 * 1000;

  // Single Persistent Channel Ref
  const channelRef = useRef<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const MarqueeText = ({ text, className, textClassName }: { text: string; className?: string; textClassName?: string; }) => {
    const containerRef = useRef<HTMLSpanElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [offset, setOffset] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
      const measure = () => {
        if (!containerRef.current || !textRef.current) return;
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;
        const overflow = Math.max(0, textWidth - containerWidth);
        setOffset(overflow);
        setDuration(overflow > 0 ? Math.min(18, 6 + overflow / 20) : 0);
      };

      const raf = requestAnimationFrame(measure);
      window.addEventListener('resize', measure);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', measure);
      };
    }, [text]);

    return (
      <span
        ref={containerRef}
        className={cn("marquee", className)}
        style={{
          ['--marquee-offset' as any]: `${offset}px`,
          ['--marquee-duration' as any]: `${duration}s`
        }}
      >
        <span
          ref={textRef}
          className={cn("marquee__inner", offset > 0 && "marquee__animate", textClassName)}
        >
          {text}
        </span>
      </span>
    );
  };

  // Robust filtering with safety checks
  const filteredPlaylist = useMemo(() => {
    if (!searchTerm) return playlist;
    return playlist.filter(item => {
      // Safety check for title existence
      const title = item.title || "";
      return title.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [playlist, searchTerm]);

  // Realtime Connection Management
  useEffect(() => {
    if (!supabase) return;

    // Watchdog for Player Activity
    const watchdog = setInterval(() => {
        const timeSinceLastHeartbeat = Date.now() - lastHeartbeat.current;
        if (isPlayerActive && timeSinceLastHeartbeat > 45000) {
            setIsPlayerActive(false);
        }
    }, 5000);

    // Use user-specific channel if available
    const channelName = userId ? `tv-control-${userId}` : 'tv-control';

    // Create channel once
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true }, // Receive own messages too just in case
        presence: { key: 'jukebox' }
      }
    });

    channelRef.current = channel;
    
    channel
      .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          if ('tv-player' in state) {
              setIsPlayerActive(true);
              lastHeartbeat.current = Date.now();
          }
      })
      .on('presence', { event: 'join' }, ({ key }) => {
          if (key === 'tv-player') {
              setIsPlayerActive(true);
              lastHeartbeat.current = Date.now();
              // Ask for status when player joins
              channel.send({
                  type: 'broadcast',
                  event: 'get_queue_status',
                  payload: {}
              }).catch((err: any) => console.error("Error asking for status", err));
          }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
           if (key === 'tv-player') {
               setIsPlayerActive(false);
           }
      })
      .on('broadcast', { event: 'queue_update' }, (payload) => {
          console.log("Queue Update Received:", payload);
          if (payload.payload?.queue) {
              setQueue(payload.payload.queue);
              // Queue update counts as activity
              lastHeartbeat.current = Date.now();
              setIsPlayerActive(true);
          }
      })
      .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              console.log("Connected to TV Control");
              setIsSubscribed(true);
              setIsConnected(true);
              await channel.track({ online_at: new Date().toISOString() });

              // Ask for initial status immediately after connecting
              channel.send({
                  type: 'broadcast',
                  event: 'get_queue_status',
                  payload: {}
              }).catch((err: any) => console.error("Error asking for status", err));
          } else {
              setIsSubscribed(false);
              setIsConnected(false);
              setIsPlayerActive(false);
          }
      });

    return () => {
        clearInterval(watchdog);
        supabase.removeChannel(channel);
        channelRef.current = null;
        setIsSubscribed(false);
        setIsConnected(false);
        setIsPlayerActive(false);
    }
  }, [userId]); // Re-subscribe if userId changes

  useEffect(() => {
    fetchPlaylist();
  }, [userId]);

  useEffect(() => {
    const saved = localStorage.getItem(cooldownKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setCooldowns(parsed);
        }
      } catch {}
    }
  }, [cooldownKey]);

  useEffect(() => {
    localStorage.setItem(cooldownKey, JSON.stringify(cooldowns));
  }, [cooldowns, cooldownKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const next: Record<string, number> = {};
      Object.entries(cooldowns).forEach(([id, ts]) => {
        if (now - ts < cooldownMs) next[id] = ts;
      });
      if (Object.keys(next).length !== Object.keys(cooldowns).length) {
        setCooldowns(next);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [cooldowns, cooldownMs]);

  const getRemainingMinutes = (id: string) => {
    const ts = cooldowns[id];
    if (!ts) return 0;
    const remaining = cooldownMs - (Date.now() - ts);
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / 60000);
  };

  const fetchPlaylist = async () => {
    try {
      if (!supabaseUrl || !publicAnonKey) {
        throw new Error("Configuração do projeto ausente");
      }

      // Pass userId query param
      const query = userId ? `?uid=${userId}` : '';

      // Parallel fetch: Playlist AND Advertisers to ensure correct filtering
      const [plRes, adsRes, logoRes] = await Promise.all([
         fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/playlist/active${query}`, {
             headers: { 'Authorization': `Bearer ${publicAnonKey}` }
         }),
         fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/advertisers${query}`, { 
             headers: { 'Authorization': `Bearer ${publicAnonKey}` } 
         }),
         fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/logo${query}`, { 
             headers: { 'Authorization': `Bearer ${publicAnonKey}` } 
         })
      ]);
      
      if (!plRes.ok) throw new Error("Falha ao carregar playlist");
      
      const plData = await plRes.json();
      const adsData = await adsRes.ok ? await adsRes.json() : { advertisers: [] };
      const logoData = await logoRes.ok ? await logoRes.json() : { logoUrl: "" };

      if (logoData.logoUrl) setLogoUrl(logoData.logoUrl);

      // 1. Build Exclusion List (Ads)
      const adUrls = new Set<string>();
      const adIds = new Set<string>();

      if (adsData.advertisers && Array.isArray(adsData.advertisers)) {
         adsData.advertisers.forEach((ad: any) => {
           if (ad.media && Array.isArray(ad.media)) {
             ad.media.forEach((m: any) => {
               if (m.url) adUrls.add(m.url);
               if (m.id) adIds.add(m.id);
             });
           }
         });
      }
      
      // 2. Filter Playlist
      if (plData.playlist && Array.isArray(plData.playlist)) {
         const validItems = plData.playlist.filter((i: any) => {
             // Basic validity
             if (!i.url) return false;
             if (!['video', 'image', 'youtube'].includes(i.type)) return false;
             if (i.type === 'ad') return false;

             // Exclusion Logic
             if (adUrls.has(i.url)) return false;
             if (adIds.has(i.id)) return false;

             return true;
         });
         setPlaylist(validItems);
      }
    } catch (err: any) {
      console.error("Error fetching playlist", err);
      setError(err.message || "Erro desconhecido");
      toast.error("Erro ao carregar playlist");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequest = async (item: any) => {
    if (!channelRef.current || !isSubscribed) {
        toast.error("Conectando ao sistema... Tente novamente em instantes.");
        return;
    }
    const remaining = getRemainingMinutes(item.id);
    if (remaining > 0) {
        toast.error(`Este conteúdo estará disponível novamente em ${remaining} min.`);
        return;
    }

    try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'request_video',
          payload: { 
             id: item.id,
             title: item.title 
          },
        });
        
        // Log request to server
        const res = await fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/jukebox/request`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: item.title,
                id: item.id
            })
        });

        if (!res.ok) {
            console.error("Failed to log request to stats");
            toast.error("Pedido enviado, mas houve erro no registro estatístico.");
        } else {
            toast.success(`Pedido enviado: ${item.title}`);
        }

        setCooldowns(prev => ({ ...prev, [item.id]: Date.now() }));
        
        setRequestSent(item.id);
        
        // Optimistic UI update: Add to local queue immediately for better feel
        // (Real sync will arrive shortly from server)
        setQueue(prev => (prev.includes(item.id) ? prev : [...prev, item.id]));

        setTimeout(() => {
            setRequestSent(null);
        }, 2000);

    } catch (err) {
        console.error("Error sending request", err);
        toast.error("Erro ao enviar pedido");
    }
  };

  if (error) {
     return (
        <div className="min-h-screen bg-[#0f0518] text-white flex items-center justify-center p-6 text-center">
            <div>
                <Tv className="w-12 h-12 text-pink-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Ops! Algo deu errado.</h2>
                <p className="text-gray-400 text-sm">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-pink-600/20 text-pink-400 rounded-lg text-sm border border-pink-500/50">
                    Tentar Novamente
                </button>
            </div>
        </div>
     );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0518] text-white flex items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-cyan-400 w-8 h-8" />
        <p className="text-sm text-cyan-400/80 animate-pulse uppercase tracking-widest font-bold">Carregando Jukebox...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0518] text-white font-sans flex flex-col overflow-hidden relative selection:bg-pink-500/30">
      
      {/* Offline Modal Overlay */}
      {!isPlayerActive && !isLoading && (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-start justify-center p-6 pt-24 animate-in fade-in duration-300 overflow-y-auto">
                <div className="bg-[#1a1025] border border-purple-500/20 rounded-2xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col items-center text-center space-y-6 relative overflow-hidden shrink-0">
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
                    
                    <div className="w-20 h-20 bg-purple-900/20 rounded-full flex items-center justify-center relative z-10 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        <MonitorPlay className="w-10 h-10 text-purple-400" />
                    </div>
                    
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold mb-3 text-white">Player Inativo</h2>
                        <p className="text-purple-200/80 leading-relaxed">
                            O player da TV não está conectado no momento. Por favor, tente novamente mais tarde.
                        </p>
                    </div>

                    <div className="w-full p-4 bg-black/40 rounded-xl border border-white/10 flex items-center justify-center gap-3 relative z-10">
                         <p className={cn("text-sm font-bold flex items-center gap-2", isConnected ? "text-green-400" : "text-red-400")}>
                             {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                             {isConnected ? "Conectado ao Servidor" : "Sem Conexão"}
                         </p>
                    </div>

                    <button 
                        onClick={() => window.location.reload()} 
                        className="flex items-center gap-2 text-purple-400 hover:text-white transition-colors text-sm font-medium pt-2 relative z-10"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tentar Recarregar
                    </button>
                </div>
            </div>
      )}

      {/* Background Ambience - Simplified for Legacy Support */}
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none bg-gradient-to-br from-[#4c1d95] via-[#0f0518] to-[#db2777]" />
      
      {/* Header */}
      <div className="p-6 pb-2 text-center sticky top-0 z-20 border-b border-white/5 bg-[#0f0518]/90 shadow-xl backdrop-blur-md">
        
        {/* Logo/Title Area */}
        <div className="flex flex-col items-center justify-center gap-4 mb-4">
           {logoUrl ? (
             <div className="relative group">
                <div className="absolute inset-0 bg-pink-600 blur-[20px] opacity-40 animate-pulse rounded-full" />
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="h-16 w-auto relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] object-contain"
                />
             </div>
           ) : (
             <div className="flex items-center justify-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-pink-600 blur-[15px] opacity-50 animate-pulse rounded-full" />
                  <div className="relative bg-black border border-pink-500/50 p-2 rounded-full shadow-[0_0_15px_rgba(236,72,153,0.4)]">
                      <Mic2 className="w-6 h-6 text-cyan-300" />
                  </div>
                </div>
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 uppercase tracking-widest italic drop-shadow-[0_2px_10px_rgba(236,72,153,0.3)] transform -skew-x-6">
                  Jukebox
                </h1>
             </div>
           )}
        </div>
        
        {/* Queue Display */}
        {queue.length > 0 && (
          <div className="max-w-md mx-auto w-full mb-4 px-1 animate-in slide-in-from-top-2 fade-in duration-300">
             <div className="bg-[#1a1025]/80 border border-purple-500/20 rounded-xl p-3 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-2 mb-2 text-purple-300 border-b border-white/5 pb-2">
                    <ListMusic className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-widest">Próximas músicas ({queue.length})</span>
                </div>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/20 pr-1">
                    {queue.map((id, idx) => {
                        const item = playlist.find(p => p.id === id);
                        if (!item) return null;
                        return (
                            <div key={`${id}-${idx}`} className="flex items-center gap-2 text-sm bg-white/5 p-1.5 rounded-lg border border-white/5">
                                <span className="flex items-center justify-center w-5 h-5 bg-purple-500/20 text-purple-400 font-bold rounded-full text-[10px] border border-purple-500/20 shadow-[0_0_5px_rgba(168,85,247,0.2)]">
                                  {idx + 1}
                                </span>
                                <MarqueeText
                                  text={item.title}
                                  className="flex-1"
                                  textClassName="text-gray-300 font-medium"
                                />
                                <div className="flex items-center gap-1 opacity-60">
                                   <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                </div>
                            </div>
                        )
                    })}
                </div>
             </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto w-full group">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-cyan-500 rounded-full blur opacity-20 group-focus-within:opacity-50 transition-opacity duration-300" />
          <div className="relative flex items-center bg-[#1a1025] border border-white/10 rounded-full px-4 py-3 shadow-inner focus-within:border-cyan-500/50 focus-within:bg-[#20152e] transition-all">
            <Search className="w-5 h-5 text-gray-400 mr-2 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Encontre sua música..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-white w-full placeholder:text-gray-600 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Playlist Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 z-10 scrollbar-hide">
        {filteredPlaylist.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center gap-4 opacity-50">
                <Disc className="w-16 h-16 text-gray-600 animate-spin-slow" />
                <p className="text-gray-400 font-medium">Nenhum vídeo encontrado</p>
            </div>
        ) : filteredPlaylist.map((item) => {
          const remainingMinutes = getRemainingMinutes(item.id);
          const isLocked = remainingMinutes > 0;
          return (
          <button 
            key={item.id}
            onClick={() => !requestSent && handleRequest(item)}
            disabled={!!requestSent || isLocked}
            className={cn(
                "w-full flex items-center gap-4 p-3 pr-4 rounded-xl border transition-all text-left group relative overflow-hidden",
                requestSent === item.id 
                    ? "bg-cyan-900/20 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]" 
                    : isLocked
                        ? "bg-[#15101f] border-white/5 opacity-60 cursor-not-allowed"
                        : "bg-[#181022] border-white/5 hover:bg-[#231730] hover:border-pink-500/30 hover:shadow-[0_4px_20px_-5px_rgba(236,72,153,0.15)] active:scale-[0.98]"
            )}
          >
            {/* Neon highlight on hover */}
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-pink-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Thumbnail */}
            <div className="w-20 h-20 bg-black rounded-lg overflow-hidden shrink-0 relative border border-white/10 shadow-lg group-hover:shadow-pink-900/20 transition-all">
               {item.type === 'youtube' ? (
                   <img src={`https://img.youtube.com/vi/${getYouTubeID(item.url)}/mqdefault.jpg`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity scale-110" alt="" />
               ) : (
                   <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      {item.thumbnail ? (
                          <img src={item.thumbnail} className="w-full h-full object-cover" alt="" />
                      ) : (
                          <Music className="w-8 h-8 text-gray-700" />
                      )}
                   </div>
               )}
               
               {/* Play Overlay */}
               {!requestSent && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                       <Play className="w-8 h-8 text-white fill-white drop-shadow-lg" />
                   </div>
               )}
               
               {/* Confirmation Overlay */}
               {requestSent === item.id && (
                   <div className="absolute inset-0 bg-cyan-500/80 flex items-center justify-center animate-in fade-in duration-300">
                        <CheckCircle className="w-8 h-8 text-white fill-cyan-900 animate-bounce" />
                   </div>
               )}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center h-full pl-2">
               <MarqueeText
                 text={item.title}
                 className="w-full mb-2"
                 textClassName={cn(
                   "font-bold text-base leading-tight transition-colors",
                   requestSent === item.id ? "text-cyan-400" : "text-gray-200 group-hover:text-white"
                 )}
               />
               
               <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 text-gray-500 font-bold border border-white/5 group-hover:border-pink-500/30 group-hover:text-pink-400 transition-colors">
                        {item.type === 'youtube' ? 'YouTube' : 'Vídeo'}
                     </span>
                     {isLocked && (
                       <span className="text-[10px] text-amber-300 font-semibold">
                         Disponível em {remainingMinutes} min
                       </span>
                     )}
                   </div>
                   
                   {requestSent === item.id && (
                       <span className="text-xs text-cyan-400 font-bold animate-pulse flex items-center gap-1">
                           <Sparkles className="w-3 h-3" /> Na sequência
                       </span>
                   )}
               </div>
            </div>
          </button>
        )})}
      </div>
      
      <div className="fixed bottom-0 left-0 w-full bg-[#0f0518]/90 backdrop-blur-xl border-t border-white/5 p-4 pb-8 text-center safe-area-bottom z-20">
         <p className="text-xs text-gray-500 font-medium tracking-wide">
             <span className="text-pink-500 animate-pulse">●</span> O vídeo pedido tocará em seguida
         </p>
      </div>
    </div>
  );
}

const getYouTubeID = (url: string) => {
  if (!url) return "";
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : "";
};
