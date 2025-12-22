import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { MediaItem } from "../components/player/MediaItem";
import { AdPlayer } from "../components/player/AdPlayer";
import { Play, Pause, Loader2, WifiOff, Clock, Volume2, VolumeX, ArrowLeft, Shuffle, Maximize, Minimize, Newspaper, Repeat, Square, Columns, HelpCircle, LogOut } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";
import QRCode from "react-qr-code";
import { useTVPlayerLogic } from "../hooks/useTVPlayerLogic";
import { HelpModal } from "../components/player/HelpModal";

interface NewsArticle {
  title: string;
  source: string;
}

function NewsTicker({ rssUrl }: { rssUrl: string }) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rssUrl) return;
    const cacheKey = `news_cache_${btoa(rssUrl)}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
          setNews(parsed.items);
          setLoading(false);
        }
      } catch {}
    }

    const fetchNews = async () => {
      try {
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/proxy/rss?url=${encodeURIComponent(rssUrl)}`, {
           headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });
        
        if (!res.ok) throw new Error("Failed to fetch RSS");
        
        const xmlText = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        const items = xmlDoc.querySelectorAll("item");
        const channelTitle = xmlDoc.querySelector("channel > title")?.textContent || "Notícias";

        const articles: NewsArticle[] = [];
        items.forEach((item, index) => {
          if (index > 19) return; 
          const title = item.querySelector("title")?.textContent;
          if (title) {
            articles.push({
              title,
              source: channelTitle
            });
          }
        });

        if (articles.length > 0) {
          setNews(articles);
          localStorage.setItem(cacheKey, JSON.stringify({ items: articles, savedAt: Date.now() }));
        } else {
             if (news.length === 0) setTimeout(fetchNews, 5000);
        }
      } catch (err) {
        console.error("Failed to fetch news", err);
        if (news.length === 0) setTimeout(fetchNews, 5000);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 10 * 60 * 1000); 
    return () => {
        clearInterval(interval);
    };
  }, [rssUrl]);

  if (!rssUrl) return null;

  return (
    <div className="w-full h-full bg-black/80 backdrop-blur-xl text-white flex items-center border-t-4 border-[#006CFF] shadow-2xl overflow-hidden">
      <div className="bg-[#006CFF] h-full px-6 flex items-center justify-center font-black uppercase tracking-wider text-xl shadow-lg z-20 whitespace-nowrap">
        {news[0]?.source || "Notícias"}
      </div>
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        {news.length > 0 ? (
        <motion.div 
          className="whitespace-nowrap flex gap-16 absolute"
          animate={{ x: ["100%", "-100%"] }} 
          transition={{ 
            repeat: Infinity, 
            duration: Math.max(30, news.length * 8), 
            ease: "linear" 
          }}
        >
          {news.map((item, i) => (
            <span key={i} className="text-2xl font-medium flex items-center gap-2">
              <span className="text-[#006CFF] font-bold">•</span>
              {item.title}
            </span>
          ))}
        </motion.div>
        ) : (
            <div className="flex items-center gap-4 pl-8 opacity-50 animate-pulse">
                <div className="w-4 h-4 rounded-full bg-white/50" />
                <span className="text-xl font-medium tracking-wide">Atualizando feed de notícias...</span>
            </div>
        )}
      </div>
      <div className="px-6 h-full flex items-center bg-black/80 backdrop-blur-xl z-20 border-l border-white/10">
         <ClockWidget />
      </div>
    </div>
  );
}

function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-white">
      <Clock className="w-6 h-6 text-[#006CFF]" />
      <span className="font-mono font-bold text-3xl">
        {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

const formatPlaybackLabel = (item: any) => {
  if (!item) return "";
  if (item.type === "youtube") return "YouTube";
  if (item.type === "image") return "Imagem";
  if (item.type === "video") return "Video";
  return item.type || "Midia";
};

const formatDuration = (seconds?: number) => {
  if (!seconds || Number.isNaN(seconds)) return "";
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
};

export default function TVPlayer() {
  const [showHelp, setShowHelp] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const {
    playlist, currentItem, rssUrl, logoUrl, 
    isLoading, error, isPlaying, isMuted, isShuffle, isFullscreen, showTicker,
    hasInteracted, layoutMode, isCurrentRequest, currentAd, isAdFullscreen, 
    isCurrentAdVideo, displayedTemplate, userId, currentAdIndex,
    handleNext, handleExit, toggleFullscreen, toggleShuffle, setShowTicker, 
    cycleLayoutMode, setIsMuted, handleUnmuteFailed, handleInteraction
  } = useTVPlayerLogic();

  useEffect(() => {
    if (!currentItem?.id) return;
    setShowNowPlaying(true);
    const timer = setTimeout(() => setShowNowPlaying(false), 7000);
    return () => clearTimeout(timer);
  }, [currentItem?.id]);

  const mediaComponent = currentItem ? (
    <div className="w-full h-full relative group bg-black">
       <div className="absolute top-4 left-4 z-50 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
         <button 
           onClick={handleExit} 
           className="p-2 bg-black/40 text-white rounded-full hover:bg-black/80 transition-all backdrop-blur-sm"
           title="Sair"
         >
            <ArrowLeft className="w-5 h-5" />
         </button>
       </div>

       <div className="absolute top-4 right-4 z-50 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
         <button 
           onClick={toggleFullscreen}
           className="p-2 bg-black/40 text-white rounded-full hover:bg-black/80 transition-all backdrop-blur-sm"
           title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
         >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
         </button>

         <button 
           onClick={toggleShuffle} 
           className={cn(
             "p-2 rounded-full transition-all backdrop-blur-sm",
             isShuffle ? "bg-[#006CFF] text-white hover:bg-blue-600" : "bg-black/40 text-white hover:bg-black/80"
           )}
           title={isShuffle ? "Desativar Aleatório" : "Ativar Aleatório"}
         >
            <Shuffle className="w-5 h-5" />
         </button>

         <button 
           onClick={() => setShowTicker(!showTicker)} 
           className={cn(
             "p-2 rounded-full transition-all backdrop-blur-sm",
             showTicker ? "bg-[#006CFF] text-white hover:bg-blue-600" : "bg-black/40 text-white hover:bg-black/80"
           )}
           title={showTicker ? "Ocultar Notícias" : "Exibir Notícias"}
         >
            <Newspaper className="w-5 h-5" />
         </button>

         <button 
           onClick={cycleLayoutMode} 
           className={cn(
             "p-2 rounded-full transition-all backdrop-blur-sm",
             layoutMode !== 'auto' ? "bg-purple-600 text-white hover:bg-purple-500" : "bg-black/40 text-white hover:bg-black/80"
           )}
           title={`Alterar Layout (${layoutMode})`}
         >
            {layoutMode === 'auto' && <Repeat className="w-5 h-5" />}
            {layoutMode === 'fullscreen' && <Square className="w-5 h-5" />}
            {layoutMode === 'l-bar' && <Columns className="w-5 h-5" />}
         </button>

         <button 
           onClick={() => setIsMuted(!isMuted)}  
           className="p-2 bg-black/40 text-white rounded-full hover:bg-black/80 transition-all backdrop-blur-sm"
           title={isMuted ? "Ativar Som" : "Mudo"}
         >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
         </button>

         <button 
           onClick={() => setShowHelp(true)}
           className="p-2 bg-black/40 text-white rounded-full hover:bg-black/80 transition-all backdrop-blur-sm"
           title="Ajuda"
         >
            <HelpCircle className="w-5 h-5" />
         </button>
       </div>

       {!isPlaying && (
         <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/50 pointer-events-none">
             <div className="p-4 bg-white/10 backdrop-blur-md rounded-full animate-pulse">
                 <Pause className="w-12 h-12 text-white" />
             </div>
         </div>
       )}

       <MediaItem 
          key={currentItem.id} 
          item={currentItem} 
          onComplete={handleNext} 
          isPlaying={isPlaying}
          isMuted={isMuted}
          onUnmuteFailed={handleUnmuteFailed}
       />
    </div>
  ) : (
    <div className="w-full h-full flex items-center justify-center text-white">
       <p>Nenhuma mídia selecionada</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#006CFF]" />
        <p className="animate-pulse">Carregando SuperScreens...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-red-500 gap-4">
        <WifiOff className="w-12 h-12" />
        <p>{error}</p>
        <div className="text-xs text-zinc-500 font-mono">
            Canal: {userId ? `tv-control-${userId}` : 'tv-control'}
        </div>
        <button onClick={handleExit} className="px-4 py-2 bg-zinc-800 rounded text-white hover:bg-zinc-700">
           Voltar ao Menu
        </button>
      </div>
    );
  }

  if (playlist.length === 0) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-gray-500 gap-4">
        <p>Aguardando publicação de conteúdo...</p>
        <button onClick={handleExit} className="px-4 py-2 bg-zinc-800 rounded text-white hover:bg-zinc-700">
           Voltar ao Menu
        </button>
      </div>
    );
  }

  const tickerComponent = rssUrl ? <NewsTicker rssUrl={rssUrl} /> : null;

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative font-sans">
       <div className={cn(
           "absolute inset-0 bg-black transition-opacity duration-700 z-20",
           isAdFullscreen ? "opacity-100" : "opacity-0 pointer-events-none"
       )}>
           {isAdFullscreen && currentAd && (
               isCurrentAdVideo ? (
                   <AdPlayer url={currentAd.url} />
               ) : (
                   <img src={currentAd.url} className="w-full h-full object-cover" />
               )
           )}
       </div>

       <div className={cn(
           "absolute transition-all duration-700 ease-in-out shadow-xl overflow-hidden",
           displayedTemplate === 'fullscreen' 
              ? "inset-0 w-full h-full z-10" 
              : isAdFullscreen
                  ? "bottom-[4%] left-[4%] w-[25%] aspect-video rounded-[1vw] z-50 border border-white/20" 
                  : "top-[2%] left-[1.5%] w-[75%] h-[83%] rounded-[1vw] z-30" 
       )}>
          {mediaComponent}
          
          <div className="absolute inset-0 pointer-events-none z-50">
             {logoUrl && (
                 <div className={cn(
                     "absolute h-[8%] transition-all duration-700",
                     displayedTemplate === 'fullscreen' && showTicker && !isAdFullscreen 
                        ? "bottom-[12%] left-[4%]" 
                        : "bottom-[4%] left-[4%]"
                 )}>
                     <img src={logoUrl} className="h-full w-auto drop-shadow-xl" />
                 </div>
             )}

             <AnimatePresence>
               {currentItem && showNowPlaying && (
                 <motion.div
                   key={currentItem.id}
                   initial={{ opacity: 0, y: -40 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -40 }}
                   transition={{ duration: 0.55, ease: "easeOut" }}
                   className="absolute left-1/2 top-[10%] z-50 max-w-[32vw] -translate-x-1/2"
                 >
                   <div className="flex items-center gap-[0.6vw] rounded-[0.7vw] bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl px-[0.8vw] py-[0.6vh]">
                     {currentItem.thumbnail && (
                       <img
                         src={currentItem.thumbnail}
                         alt={currentItem.title || "Miniatura do conteudo"}
                         className="h-[5vh] w-[5vh] rounded-[0.4vw] object-cover shadow-md"
                         loading="lazy"
                       />
                     )}
                     <div className="min-w-0 flex-1">
                       <p className="text-[0.75vw] font-semibold text-white line-clamp-2">
                         {currentItem.title || "Conteudo em reproducao"}
                       </p>
                       <div className="mt-[0.2vh] flex items-center gap-[0.4vw] text-[0.6vw] text-white/70 uppercase tracking-wider">
                         <span>{formatPlaybackLabel(currentItem)}</span>
                         {currentItem.duration ? (
                           <>
                             <span className="h-[0.4vh] w-[0.4vh] rounded-full bg-white/40" />
                             <span>{formatDuration(currentItem.duration)}</span>
                           </>
                         ) : null}
                       </div>
                     </div>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

             {isCurrentRequest && (
                 <div
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 z-50",
                    "bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl",
                    "flex items-center",
                    "animate-fade-in transition-all duration-700"
                  )}
                  style={{ 
                    top: showNowPlaying ? "18%" : "6%",
                    padding: "19px 34px",
                    gap: "16px",
                    borderRadius: "18px"
                  }}
                >
                    <span className="leading-none" style={{ fontSize: "34px" }}>🎵</span>
                    <span className="font-black uppercase tracking-wide text-white leading-tight" style={{ fontSize: "29px" }}>
                       Pedido do Cliente
                    </span>
                </div>
            )}

             <div className={cn(
                 "absolute top-[4%] left-[4%] transition-all duration-700 max-w-[15vw]",
                 displayedTemplate === 'fullscreen' ? "opacity-100" : "opacity-0 pointer-events-none"
             )}>
                 <div className="relative rounded-[0.5vw] shadow-2xl overflow-hidden bg-black/70 backdrop-blur-xl border border-white/10 group flex flex-row items-center p-[0.5vw] gap-[0.8vw]">
                      <div className="relative z-10 shrink-0">
                          <div className="p-[0.2vw] rounded-[0.4vw] bg-gradient-to-b from-gray-700 to-black border border-gray-600 shadow-lg">
                               <div className="bg-[#0f172a] p-[0.3vw] rounded-[0.3vw] relative overflow-hidden">
                                   <div className="bg-white p-[0.2vw] rounded-[0.2vw]">
                                        <QRCode 
                                            value={`${window.location.origin}/remote${userId ? `?uid=${userId}` : ''}`} 
                                            size={256}
                                            style={{ height: "auto", width: "5vw", minWidth: "60px", aspectRatio: "1/1" }}
                                            viewBox={`0 0 256 256`}
                                        />
                                   </div>
                               </div>
                          </div>
                      </div>

                      <div className="flex flex-col z-10 pr-[0.5vw]">
                          <div className="bg-black/40 border border-pink-500/30 px-[0.6vw] py-[0.2vh] rounded-full backdrop-blur-sm self-start mb-[0.5vh] shadow-[0_0_8px_rgba(236,72,153,0.2)]">
                              <span className="text-[0.6vw] font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-300 uppercase tracking-[0.1em]">
                                  Jukebox
                              </span>
                          </div>
                          <p className="text-[0.7vw] font-bold text-cyan-300 uppercase tracking-wider animate-pulse leading-none mb-[0.2vh]">
                              Peça seu vídeo
                          </p>
                      </div>
                 </div>
             </div>
          </div>
       </div>

       <div className={cn(
           "absolute top-[2%] right-[1.5%] bottom-[2%] w-[20.5%] flex flex-col gap-[1vh] transition-all duration-700 z-20",
           displayedTemplate === 'l-bar' && !isAdFullscreen ? "translate-x-0 opacity-100" : "translate-x-[120%] opacity-0 pointer-events-none"
       )}>
           <div className="bg-[#0F1C2E] border border-white/10 rounded-[0.5vw] p-[0.5vh] text-center shrink-0">
               <h3 className="text-[0.8vw] font-bold text-[#006CFF] uppercase tracking-[0.2em]">Publicidade</h3>
           </div>
           
           <div className="w-full aspect-[9/16] bg-black rounded-[0.5vw] overflow-hidden relative shadow-lg">
               <AnimatePresence mode="wait">
                  {!isAdFullscreen && currentAd && (
                    <motion.div
                        key={currentAd.id || currentAdIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full relative"
                    >
                         {isCurrentAdVideo ? (
                             <AdPlayer url={currentAd.url} />
                         ) : (
                             <img src={currentAd.url} className="w-full h-full object-cover" />
                         )}
                    </motion.div>
                  )}
               </AnimatePresence>
           </div>
           
           <div className="flex-1 relative rounded-[0.5vw] shadow-2xl overflow-hidden bg-[#1a0b1c] border-t-4 border-x-4 border-b-8 border-[#2a1b2c] group flex flex-col">
                <div className="absolute inset-0 z-0 opacity-30" 
                     style={{ 
                         backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', 
                         backgroundSize: '4px 4px' 
                     }} 
                />
                
                <div 
                    className="absolute inset-0 z-0 bg-cover bg-center opacity-60 mix-blend-overlay group-hover:opacity-70 transition-opacity duration-700"
                    style={{ backgroundImage: `url('https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80')` }} 
                />
                <div className="absolute inset-0 z-0 bg-gradient-to-b from-purple-900/50 via-transparent to-black/90" />
                
                <div className="relative z-10 w-full pt-[1vh] flex justify-center shrink-0">
                    <div className="relative">
                        <div className="absolute inset-0 bg-pink-500 blur-[20px] opacity-60 animate-pulse" />
                        <div className="bg-black/80 border-2 border-pink-500/80 px-[1.2vw] py-[0.5vh] rounded-full backdrop-blur-md relative z-10 shadow-[0_0_15px_rgba(236,72,153,0.5)] flex items-center gap-[0.5vw]">
                             <span className="text-[1vw] leading-none">🎵</span>
                             <span className="text-[0.9vw] font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 uppercase tracking-[0.2em] drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
                                Jukebox
                             </span>
                             <span className="text-[1vw] leading-none transform scale-x-[-1]">🎵</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center relative z-10 py-[0.5vh] min-h-0">
                    <div className="relative group/screen h-full max-h-full aspect-square flex items-center justify-center">
                        <div className="p-[0.4vw] rounded-[1vw] bg-gradient-to-b from-gray-700 via-gray-900 to-black shadow-[0_0_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-gray-800 h-full w-auto aspect-square flex items-center justify-center">
                             <div className="bg-[#0f172a] p-[0.6vw] rounded-[0.7vw] relative z-10 shadow-[inset_0_0_20px_rgba(0,0,0,1)] border border-white/5 overflow-hidden h-full w-full flex items-center justify-center">
                                  <div className="bg-white p-[0.4vw] rounded-[0.4vw] shadow-[0_0_25px_rgba(255,255,255,0.2)] h-full w-full flex items-center justify-center">
                                      <QRCode 
                                          value={`${window.location.origin}/remote${userId ? `?uid=${userId}` : ''}`} 
                                          size={256}
                                          style={{ height: "100%", width: "100%", objectFit: "contain" }}
                                          viewBox={`0 0 256 256`}
                                      />
                                  </div>
                             </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 pb-[1vh] flex flex-col items-center gap-[0.5vh] text-center shrink-0">
                    <div className="bg-black/60 px-[0.8vw] py-[0.3vh] rounded-full backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                        <p className="text-[0.6vw] font-bold text-cyan-300 uppercase tracking-widest animate-pulse">
                            Escaneie para pedir
                        </p>
                    </div>
                </div>
           </div>
       </div>

       <div className={cn(
            "absolute z-40 transition-all duration-700 ease-in-out overflow-hidden shadow-2xl",
            showTicker && !isAdFullscreen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none",
            displayedTemplate === 'l-bar' 
                ? "left-[1.5%] bottom-[2%] w-[75%] h-[13%] rounded-b-[1vw]" 
                : "left-0 bottom-0 w-full h-[10%]"
       )}>
            {tickerComponent}
       </div>

       {/* Interaction Overlay to unlock Audio Context */}
       {!hasInteracted && (
           <div 
               className="absolute inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center cursor-pointer backdrop-blur-sm"
               onClick={handleInteraction}
           >
               <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleExit();
                    }}
                    className="absolute top-8 right-8 flex items-center gap-2 text-zinc-500 hover:text-white hover:bg-white/10 px-4 py-2 rounded-full transition-all z-[110]"
               >
                   <LogOut className="w-5 h-5" />
                   <span className="text-sm font-bold uppercase tracking-wider">Sair</span>
               </button>

               <div className="bg-white/10 p-8 rounded-full backdrop-blur-md animate-pulse border border-white/20 shadow-[0_0_50px_rgba(0,108,255,0.3)] hover:scale-110 transition-transform duration-300">
                   <Play className="w-16 h-16 text-white fill-current" />
               </div>
               <p className="mt-8 text-white font-light text-2xl tracking-[0.2em] uppercase">Toque para Iniciar</p>
               <p className="mt-2 text-zinc-400 text-sm">Habilita o som e controle remoto</p>
           </div>
       )}

       <HelpModal open={showHelp} onOpenChange={setShowHelp} />
    </div>
  );
}
