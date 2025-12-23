import { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { usePlayerControl } from "../../hooks/usePlayerControl";
import { supabaseUrl, publicAnonKey } from "../../utils/supabase/info";
import { supabase } from "../../utils/supabase/client";
import { Loader2, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, List, Tv, Wifi, WifiOff, Trash2, Smartphone, Search, RefreshCw, Disc, Newspaper, LayoutTemplate, Square, Columns, LogOut, Home, Shuffle, MonitorPlay, Copy, ExternalLink, QrCode } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { toast } from "sonner@2.0.3";

export default function RemoteControl() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("uid") || "";
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        
        const role = session.user.user_metadata?.role;
        const isUserAdmin = role === 'admin';
        
        setIsAdmin(isUserAdmin);
        setCurrentUser(session.user);
        setLoading(false);

        // Enforcement Logic
        if (!isUserAdmin) {
            // If not admin, MUST be on their own ID
            if (!userId || userId !== session.user.id) {
                navigate(`/admin/remote?uid=${session.user.id}`, { replace: true });
            }
        }
    });
  }, [userId, navigate]);

  if (loading) {
      return (
          <div className="min-h-screen bg-black flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
      );
  }

  // If no User ID (and Admin, because non-admins are redirected), show selector
  if (!userId) {
     return <UserSelector />;
  }

  return <RemoteInterface userId={userId} isAdmin={isAdmin} />;
}

function UserSelector() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/users`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    })
    .then(res => res.json())
    .then(data => setUsers(data.users || []))
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => 
      (u.name || u.email).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
       <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
           <Smartphone className="w-8 h-8 text-blue-500" />
           Selecionar Player
       </h1>
       
       <div className="relative mb-6">
           <Search className="absolute left-3 top-3 text-zinc-500 w-5 h-5" />
           <input 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-600 outline-none"
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
           />
       </div>

       {loading ? (
           <div className="flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
       ) : (
           <div className="grid gap-3">
               {filtered.map(user => (
                   <Card 
                      key={user.id} 
                      onClick={() => navigate(`/admin/remote?uid=${user.id}`)}
                      className="p-4 bg-zinc-900 border-zinc-800 hover:border-blue-500/50 cursor-pointer transition-all flex items-center justify-between group"
                   >
                       <div>
                           <div className="font-bold text-lg">{user.name || user.email}</div>
                           <div className="text-zinc-500 text-sm">{user.email}</div>
                       </div>
                       <Tv className="w-6 h-6 text-zinc-600 group-hover:text-blue-500 transition-colors" />
                   </Card>
               ))}
           </div>
       )}
    </div>
  );
}

function RemoteInterface({ userId, isAdmin }: { userId: string, isAdmin: boolean }) {
  const { isConnected, isPlayerActive, status, play, pause, next, prev, toggleMute, setVolume, removeFromQueue, clearQueue, reload, toggleTicker, toggleLayout, toggleShuffle } = usePlayerControl(userId);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [availablePlaylists, setAvailablePlaylists] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [volume, setVolumeState] = useState(100);
  const navigate = useNavigate();
  const MarqueeText = ({ text, className, textClassName }: { text: string; className?: string; textClassName?: string; }) => {
    const containerRef = useRef<HTMLSpanElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [offset, setOffset] = useState(0);
    const [duration, setDuration] = useState(0);

    useLayoutEffect(() => {
      const measure = () => {
        if (!containerRef.current || !textRef.current) return;
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;
        const overflow = Math.max(0, textWidth - containerWidth);
        setOffset(overflow);
        setDuration(overflow > 0 ? Math.min(18, 6 + overflow / 20) : 0);
      };

      const raf = requestAnimationFrame(measure);
      const timeout = window.setTimeout(measure, 0);
      window.addEventListener('resize', measure);
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(timeout);
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

  useEffect(() => {
    if (typeof status.volume === "number") {
      setVolumeState(status.volume);
    }
  }, [status.volume]);

  useEffect(() => {
    const isTextInput = (el: HTMLElement | null) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };

    const handleMediaKeys = (event: KeyboardEvent) => {
      if (isTextInput(document.activeElement as HTMLElement | null)) return;
      const code = event.code || event.key;
      const lower = String(code);

      if (["MediaPlayPause"].includes(lower)) {
        event.preventDefault();
        status.isPlaying ? pause() : play();
        return;
      }
      if (["MediaTrackNext"].includes(lower)) {
        event.preventDefault();
        next();
        return;
      }
      if (["MediaTrackPrevious"].includes(lower)) {
        event.preventDefault();
        prev();
        return;
      }
      if (["MediaStop"].includes(lower)) {
        event.preventDefault();
        pause();
        return;
      }
      if (["AudioVolumeMute", "VolumeMute"].includes(lower)) {
        event.preventDefault();
        toggleMute();
        return;
      }
      if (["AudioVolumeUp", "VolumeUp"].includes(lower)) {
        event.preventDefault();
        const nextVolume = Math.min(100, volume + 10);
        setVolumeState(nextVolume);
        setVolume(nextVolume);
        return;
      }
      if (["AudioVolumeDown", "VolumeDown"].includes(lower)) {
        event.preventDefault();
        const nextVolume = Math.max(0, volume - 10);
        setVolumeState(nextVolume);
        setVolume(nextVolume);
      }
    };

    window.addEventListener("keydown", handleMediaKeys);
    return () => window.removeEventListener("keydown", handleMediaKeys);
  }, [status.isPlaying, pause, play, next, prev, toggleMute, setVolume, volume]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) setToken(session.access_token);
    });
  }, []);

  // Fetch Logo
  useEffect(() => {
    fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/logo?uid=${userId}`, {
         headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    })
    .then(res => res.json())
    .then(data => setLogoUrl(data.logoUrl))
    .catch(console.error);
  }, [userId]);

  const handleLogout = async () => {
      await supabase.auth.signOut();
      navigate('/login');
  };

  // Load Playlist Metadata
  useEffect(() => {
     fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/playlist/active?uid=${userId}`, {
         headers: { 'Authorization': `Bearer ${publicAnonKey}` }
     })
     .then(res => res.json())
     .then(data => setPlaylist(data.playlist || []))
     .catch(console.error);
  }, [userId]);


  // Load Available Playlists
  useEffect(() => {
      if (showPlaylists && token) {
          fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/playlists`, {
              headers: { 'Authorization': `Bearer ${token}` }
          })
          .then(res => res.json())
          .then(async data => {
              // Filter logic could be here, but for Admin we see all. 
              // Ideally we'd filter by ownerId if it was consistently saved.
              // For now, let's show all and let admin decide.
              const basePlaylists = data.playlists || [];
              const enriched = await Promise.all(basePlaylists.map(async (pl: any) => {
                  try {
                      const res = await fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/playlists/${pl.id}`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                      });
                      if (!res.ok) return { ...pl, durationMinutes: null };
                      const details = await res.json();
                      const items = Array.isArray(details.items) ? details.items : [];
                      const totalSeconds = items.reduce((sum: number, item: any) => sum + (Number(item.duration) || 0), 0);
                      const minutes = totalSeconds > 0 ? Math.ceil(totalSeconds / 60) : 0;
                      return { ...pl, durationMinutes: minutes };
                  } catch {
                      return { ...pl, durationMinutes: null };
                  }
              }));
              setAvailablePlaylists(enriched);
          })
          .catch(console.error);
      }
  }, [showPlaylists, token]);

  const handleSwitchPlaylist = async (playlistId: string) => {
      if (!token) {
          toast.error("Você precisa estar logado para trocar playlists.");
          return;
      }
      const toastId = toast.loading("Trocando playlist...");
      try {
          // 1. Get Content
          const res = await fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/playlists/${playlistId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          
          if (!data.items) throw new Error("Playlist vazia");

          // 2. Publish
          await fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/playlist/publish`, {
              method: 'POST',
              headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ playlist: data.items, targetUserId: userId })
          });
          
          // 3. Reload Player
          reload();
          
          // 4. Update local preview
          setPlaylist(data.items);
          
          toast.success("Playlist alterada com sucesso!", { id: toastId });
          setShowPlaylists(false);
      } catch (e) {
          console.error(e);
          toast.error("Erro ao trocar playlist", { id: toastId });
      }
  };

  const currentItem = useMemo(() => 
     playlist.find(p => p.id === status.currentId) || playlist[status.currentIndex], 
  [playlist, status.currentId, status.currentIndex]);

  const queueItems = useMemo(() => 
     status.queue.map(id => playlist.find(p => p.id === id)).filter(Boolean),
  [status.queue, playlist]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans relative">
        
        {/* Offline Modal Overlay */}
        {!isPlayerActive && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center animate-pulse">
                        <MonitorPlay className="w-10 h-10 text-zinc-500" />
                    </div>
                    
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Aguardando Player</h2>
                        <p className="text-zinc-400">O player na TV está aguardando interação ou desconectado. Toque na tela da TV para iniciar.</p>
                    </div>

                    <div className="w-full p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-center gap-3">
                         <p className="text-zinc-600 text-sm">
                             Status: {isConnected ? "Conectado ao Servidor" : "Desconectado do Servidor"}
                         </p>
                    </div>

                    <button 
                        onClick={() => navigate('/client/home')} 
                        className="flex items-center gap-2 text-zinc-500 hover:text-blue-500 transition-colors text-sm font-medium pt-2"
                    >
                        <Home className="w-4 h-4" />
                        Voltar ao Menu Principal
                    </button>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/10 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50 relative">
            <div className="flex items-center gap-3 z-20">
                 {!isAdmin && (
                    <button onClick={() => navigate('/client/home')} className="text-zinc-400 hover:text-white" title="Dashboard">
                        <Home className="w-6 h-6" />
                    </button>
                 )}
                 {isAdmin && (
                    <button onClick={() => navigate('/admin/remote')} className="text-zinc-400 hover:text-white">
                        <List className="w-6 h-6" />
                    </button>
                 )}
            </div>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                 {logoUrl ? (
                     <img src={logoUrl} className="h-8 w-auto object-contain max-w-[120px]" alt="Logo" />
                 ) : (
                     <span className="font-bold text-lg hidden sm:block">SuperScreens</span>
                 )}
            </div>
            
            <div className="flex items-center gap-3 z-20">
                <div className="flex items-center gap-2">
                    {isConnected ? (
                        <span className="flex items-center gap-1.5 text-green-500 text-xs font-bold uppercase tracking-wider bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                            <Wifi className="w-3 h-3" /> <span className="hidden xs:inline">Conectado</span>
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-red-500 text-xs font-bold uppercase tracking-wider bg-red-500/10 px-2 py-1 rounded-full border border-red-500/20 animate-pulse">
                            <WifiOff className="w-3 h-3" /> <span className="hidden xs:inline">Buscando...</span>
                        </span>
                    )}
                </div>
                
                <button onClick={() => setShowPlaylists(true)} className="text-zinc-400 hover:text-blue-500 p-1">
                    <Disc className="w-6 h-6" />
                </button>
            </div>
        </div>

        {/* Now Playing Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative overflow-hidden">
            {/* Background Blur */}
            {currentItem?.thumbnail && (
                <div 
                    className="absolute inset-0 opacity-20 blur-3xl scale-150 z-0 pointer-events-none"
                    style={{ backgroundImage: `url(${currentItem.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
            )}

            <div className="relative z-10 w-full max-w-sm aspect-video bg-zinc-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden group">
                 {currentItem ? (
                     <img 
                        src={currentItem.thumbnail || currentItem.url} 
                        className="w-full h-full object-cover" 
                        onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80")}
                     />
                 ) : (
                     <div className="w-full h-full flex items-center justify-center text-zinc-700">
                         <Tv className="w-16 h-16" />
                     </div>
                 )}
                 
                 {/* Status Overlay */}
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-xs font-mono">{status.currentId}</span>
                 </div>
            </div>

            <div className="text-center z-10 max-w-sm w-full">
                <MarqueeText
                  text={currentItem?.title || "Carregando..."}
                  className="w-full mb-1"
                  textClassName="text-2xl font-bold"
                />
                <p className="text-zinc-400 text-sm uppercase tracking-widest">{currentItem?.type || "Player Offline"}</p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-6 z-10">
                <button onClick={prev} className="p-4 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 active:scale-95 transition-all">
                    <SkipBack className="w-6 h-6" />
                </button>
                
                <button 
                    onClick={status.isPlaying ? pause : play} 
                    className="p-6 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500 active:scale-95 transition-all"
                >
                    {status.isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </button>

                <button onClick={next} className="p-4 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 active:scale-95 transition-all">
                    <SkipForward className="w-6 h-6" />
                </button>
            </div>

            <div className="flex items-center gap-4 z-10 w-full max-w-xs justify-center">
                <button onClick={toggleMute} className={cn("p-2 rounded-full transition-colors", status.isMuted ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-400")} title={status.isMuted ? "Ativar Som" : "Mudo"}>
                    {status.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <button onClick={toggleShuffle} className={cn("p-2 rounded-full transition-colors", status.isShuffle ? "bg-green-500 text-white" : "bg-zinc-800 text-zinc-400")} title={status.isShuffle ? "Desativar Aleatório" : "Ativar Aleatório"}>
                    <Shuffle className="w-5 h-5" />
                </button>
                
                <button onClick={toggleLayout} className={cn("p-2 rounded-full transition-colors", status.layoutMode !== 'auto' ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400")} title={`Alterar Layout (Atual: ${status.layoutMode})`}>
                    {status.layoutMode === 'auto' && <LayoutTemplate className="w-5 h-5" />}
                    {status.layoutMode === 'fullscreen' && <Square className="w-5 h-5" />}
                    {status.layoutMode === 'l-bar' && <Columns className="w-5 h-5" />}
                </button>

                <button onClick={toggleTicker} className={cn("p-2 rounded-full transition-colors", status.showTicker ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400")} title={status.showTicker ? "Ocultar Notícias" : "Exibir Notícias"}>
                    <Newspaper className="w-5 h-5" />
                </button>

                <button onClick={reload} className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white" title="Recarregar Player">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Queue Drawer */}
        <div className="bg-zinc-900/80 border-t border-white/5 backdrop-blur-xl h-[40vh] flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                    <List className="w-4 h-4 text-blue-500" />
                    Fila ({status.queue.length})
                </h3>
                {status.queue.length > 0 && (
                    <button onClick={clearQueue} className="text-xs text-red-400 hover:text-red-300">
                        Limpar
                    </button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {status.queue.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2 opacity-50">
                        <List className="w-8 h-8" />
                        <p className="text-sm">Fila vazia</p>
                    </div>
                ) : (
                    queueItems.map((item, idx) => (
                        <div key={`${item.id}-${idx}`} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="w-6 h-6 flex items-center justify-center bg-black/50 rounded-full text-xs font-mono text-zinc-500">
                                {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-sm">{item.title}</div>
                            </div>
                            <button 
                                onClick={() => removeFromQueue(idx)}
                                className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Playlist Selector Overlay */}
        {showPlaylists && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-200">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Disc className="w-6 h-6 text-purple-500" />
                        Trocar Playlist
                    </h2>
                    <button onClick={() => setShowPlaylists(false)} className="text-zinc-400 hover:text-white">
                        Fechar
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {availablePlaylists.length === 0 ? (
                         <div className="text-center text-zinc-500 mt-10">Nenhuma playlist encontrada</div>
                    ) : (
                         availablePlaylists.map(pl => (
                             <button 
                                key={pl.id}
                                onClick={() => handleSwitchPlaylist(pl.id)}
                                className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between hover:border-purple-500/50 hover:bg-zinc-800 transition-all text-left"
                             >
                                 <span className="font-bold">{pl.name}</span>
                                 <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-bold">
                                     <span>{pl.durationMinutes !== null ? `${pl.durationMinutes} min` : "-- min"}</span>
                                     <Play className="w-3 h-3" />
                                 </div>
                             </button>
                         ))
                    )}
                </div>
            </div>
        )}
    </div>
  );
}
