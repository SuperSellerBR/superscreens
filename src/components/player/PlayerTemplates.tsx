import { Monitor, Calendar, Music, UtensilsCrossed, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import QRCode from "react-qr-code";

interface PlayerTemplateProps {
  children: ReactNode; // The main media player
  ticker?: ReactNode; // The news ticker component
  ads?: any[]; // Secondary ads
  meta?: any; // Extra metadata
  logoUrl?: string; // User logo for branding
  remoteUrl?: string; // URL for remote control
  isUserRequest?: boolean; // If current video is a user request
  contentKey?: string; // Unique key for content transitions
}

// Helper for rotating ads
export const SideAdRotator = ({ ads }: { ads?: any[] }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!ads || ads.length <= 1) return;
    
    // Safety check for index bounds
    if (index >= ads.length) {
      setIndex(0);
      return;
    }

    const currentAd = ads[index];
    const duration = (currentAd?.duration || 10) * 1000;
    
    const timer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % ads.length);
    }, duration);
    return () => clearTimeout(timer);
  }, [ads, index]);

  // Ensure we have valid data before rendering
  if (!ads || ads.length === 0) {
    // Fallback static ad
    return (
       <div className="w-full h-full relative overflow-hidden">
         <img 
           src="https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=400&q=80" 
           className="w-full h-full object-cover opacity-90" 
           alt="Ad Placeholder" 
         />
         <div className="absolute bottom-0 w-full bg-black/50 text-white text-xs p-2 text-center">
            Seja um parceiro
         </div>
       </div>
    );
  }

  // Safe access to current ad
  const safeIndex = index < ads.length ? index : 0;
  const currentAd = ads[safeIndex];

  if (!currentAd) return null;

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAd.id || safeIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 w-full h-full"
        >
          {currentAd.type === 'video' ? (
             <video 
               src={currentAd.url} 
               className="w-full h-full object-cover" 
               autoPlay 
               muted 
               loop 
               playsInline 
             />
          ) : (
             <img 
               src={currentAd.url} 
               alt="Ad" 
               className="w-full h-full object-cover" 
             />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Helper for rotating Ticker and Stripe Ads
export const TickerRotator = ({ ticker, ads }: { ticker?: ReactNode, ads: any[] }) => {
  const [mode, setMode] = useState<'ticker' | 'ad'>('ticker');
  const [adIndex, setAdIndex] = useState(0);

  useEffect(() => {
    if (!ads || ads.length === 0) {
      setMode('ticker');
      return;
    }

    // Cycle Config
    const tickerDuration = 30000; // 30s News
    
    let timer: any;

    if (mode === 'ticker') {
       timer = setTimeout(() => {
         setMode('ad');
       }, tickerDuration);
    } else {
       const currentAd = ads[adIndex];
       const adDuration = (currentAd?.duration || 10) * 1000;
       
       timer = setTimeout(() => {
         setMode('ticker');
         setAdIndex(prev => (prev + 1) % ads.length);
       }, adDuration);
    }

    return () => clearTimeout(timer);
  }, [mode, ads, adIndex]);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl shadow-lg border border-white/5 bg-[#1a2c42]">
      <AnimatePresence mode="wait">
        {mode === 'ad' && ads.length > 0 ? (
          <motion.div
             key="stripe-ad"
             initial={{ y: "100%" }}
             animate={{ y: 0 }}
             exit={{ y: "-100%" }}
             transition={{ duration: 0.5 }}
             className="absolute inset-0 z-30"
          >
             {(() => {
               const ad = ads[adIndex] || ads[0];
               return ad.type === 'video' ? (
                  <video src={ad.url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
               ) : (
                  <img src={ad.url} className="w-full h-full object-cover" />
               );
             })()}
          </motion.div>
        ) : (
          <motion.div
             key="news-ticker"
             initial={{ y: "-100%" }}
             animate={{ y: 0 }}
             exit={{ y: "100%" }}
             transition={{ duration: 0.5 }}
             className="w-full h-full"
          >
             {/* We wrap ticker in a standard container if needed, or render as is */}
             {ticker ? (
                 <div className="w-full h-full">{ticker}</div>
             ) : (
                 <div className="w-full h-full flex items-center justify-center text-gray-400 bg-[#1a2c42]">
                   <span className="animate-pulse">Notícias em breve...</span>
                 </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FullscreenTemplate = ({ children, ticker, contentKey, logoUrl, remoteUrl }: PlayerTemplateProps) => (
  <div className="w-full h-full relative bg-black flex flex-col">
    <div className="flex-1 relative overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        <motion.div 
           key={contentKey || 'content'}
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.5 }}
           className="w-full h-full absolute inset-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Overlays Layer */}
      <div className="absolute inset-0 z-40 pointer-events-none">
          {/* QR Code - Bottom Left */}
          {remoteUrl && (
             <div className="absolute bottom-8 left-8 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl flex items-center gap-4 animate-in slide-in-from-left fade-in duration-700">
                 <div className="bg-white p-1 rounded-xl">
                     <QRCode 
                         value={remoteUrl} 
                         size={70} 
                         style={{ height: "auto", maxWidth: "100%", width: "70px" }}
                         viewBox={`0 0 256 256`}
                     />
                 </div>
                 <div className="flex flex-col pr-2">
                     <p className="text-[10px] font-black text-[#006CFF] uppercase tracking-widest mb-0.5">Jukebox</p>
                     <p className="text-sm font-bold text-gray-900 leading-tight">Peça seu<br/>vídeo!</p>
                 </div>
             </div>
          )}

          {/* Logo - Bottom Right */}
          {logoUrl && (
             <div className="absolute bottom-8 right-8 animate-in slide-in-from-right fade-in duration-700">
                 <img src={logoUrl} className="h-24 w-auto drop-shadow-xl object-contain" alt="Logo" />
             </div>
          )}
      </div>

    </div>
    {ticker && (
      <div className="h-16 flex-shrink-0 relative z-50">
        {ticker}
      </div>
    )}
  </div>
);

export const LBarTemplate = ({ children, ticker, ads, logoUrl, remoteUrl, isUserRequest }: PlayerTemplateProps) => {
  // 1. Categorize Ads
  const sidebarAds = ads?.filter(a => a.layout === 'sidebar' || a.layout === 'l-bar' || a.layout === 'all') || [];
  const stripeAds = ads?.filter(a => a.layout === 'stripe') || [];
  const fullscreenAds = ads?.filter(a => a.layout === 'fullscreen') || [];

  // 2. Fullscreen Interrupt State
  const [activeFullscreenAd, setActiveFullscreenAd] = useState<any | null>(null);

  // 3. Scheduler for Fullscreen Ads
  useEffect(() => {
    if (fullscreenAds.length === 0) return;

    // Trigger every 60 seconds (approx)
    const interval = setInterval(() => {
       if (!activeFullscreenAd) {
          // Pick a random ad
          const nextAd = fullscreenAds[Math.floor(Math.random() * fullscreenAds.length)];
          setActiveFullscreenAd(nextAd);
       }
    }, 60000);

    return () => clearInterval(interval);
  }, [fullscreenAds, activeFullscreenAd]);

  // 4. Handle Ad Completion
  useEffect(() => {
    if (activeFullscreenAd) {
       const duration = (activeFullscreenAd.duration || 15) * 1000;
       const timer = setTimeout(() => {
         setActiveFullscreenAd(null);
       }, duration);
       return () => clearTimeout(timer);
    }
  }, [activeFullscreenAd]);

  const isAdMode = !!activeFullscreenAd;

  // Unified Render with Absolute Positioning for seamless transitions
  return (
    <div className="w-full h-full bg-[#0F1C2E] font-sans box-border overflow-hidden relative">
      
      {/* BACKGROUND AD LAYER (Only visible when activeFullscreenAd is set) */}
      <div 
        className={cn(
           "absolute inset-0 z-10 transition-opacity duration-500", 
           isAdMode ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
         {activeFullscreenAd && (
             <div className="w-full h-full relative bg-black">
                 {activeFullscreenAd.type === 'video' ? (
                     <video 
                       src={activeFullscreenAd.url} 
                       className="w-full h-full object-cover" 
                       autoPlay 
                       muted 
                       loop 
                     />
                 ) : (
                     <img 
                       src={activeFullscreenAd.url} 
                       className="w-full h-full object-cover" 
                     />
                 )}
             </div>
         )}
      </div>

      {/* STANDARD L-BAR ELEMENTS LAYER (Fades out in Ad Mode) */}
      <div 
        className={cn(
            "absolute inset-0 z-20 transition-all duration-500 ease-in-out p-4 flex gap-4",
            isAdMode ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
        )}
      >
          {/* Left Column Placeholder (Structure only) */}
          <div className="flex-1 flex flex-col gap-4 min-w-0 h-full">
              <div className="flex-1" /> {/* Video takes this space via absolute positioning */}
              
              {/* Ticker Area */}
              <div className="h-24 shrink-0 bg-[#1a2c42] rounded-xl overflow-hidden shadow-lg border border-white/5 relative">
                  <TickerRotator ticker={ticker} ads={stripeAds} />
              </div>
          </div>

          {/* Right Column Sidebar */}
          <div className="w-[30%] min-w-[350px] max-w-[500px] flex flex-col gap-4 shrink-0 h-full">
              {/* Top Header */}
              <div className="bg-[#0F1C2E] border border-white/10 rounded-xl p-2 text-center shrink-0">
                  <h3 className="text-[10px] font-bold text-[#006CFF] uppercase tracking-[0.2em]">Patrocínio</h3>
              </div>

              {/* Ad Slot */}
              <div className="w-full aspect-[9/16] bg-white rounded-xl overflow-hidden relative shadow-lg flex flex-col shrink-0">
                  <div className="flex-1 relative bg-black">
                      <SideAdRotator ads={sidebarAds} />
                  </div>
              </div>

              {/* Bottom Widget */}
              <div className="flex-1 rounded-xl overflow-hidden relative flex items-center justify-center min-h-0 border border-white/10 bg-[#0F1C2E]">
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                      {/* Logic: If Remote URL -> QR Code. Else -> Logo or Clock */}
                      {remoteUrl ? (
                          <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-500 w-full">
                              <div className="bg-white p-3 rounded-2xl shadow-2xl w-full max-w-[220px] aspect-square flex items-center justify-center">
                                  <QRCode 
                                    value={remoteUrl} 
                                    size={256} 
                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                    viewBox={`0 0 256 256`}
                                  />
                              </div>
                              <p className="text-xs uppercase font-bold text-[#006CFF] text-center leading-relaxed tracking-wider">
                                  Escaneie para<br/>pedir um vídeo
                              </p>
                              
                              {/* User Request Feedback Message */}
                              {isUserRequest && (
                                <div className="mt-2 w-full max-w-[240px] bg-gradient-to-r from-[#006CFF] to-blue-600 p-3 rounded-xl shadow-lg animate-in slide-in-from-bottom fade-in border border-white/20">
                                   <div className="flex items-center gap-3">
                                      <div className="bg-white/20 p-2 rounded-full animate-pulse">
                                         <Music className="w-4 h-4 text-white" />
                                      </div>
                                      <div>
                                         <p className="text-[10px] text-blue-100 uppercase font-bold tracking-wider mb-0.5">Pedido Especial</p>
                                         <p className="text-xs text-white font-medium leading-tight">
                                            Vídeo escolhido por um cliente agora!
                                         </p>
                                      </div>
                                   </div>
                                </div>
                              )}
                          </div>
                      ) : !isAdMode && (
                        logoUrl ? (
                            <img src={logoUrl} alt="Brand Logo" className="w-full h-full object-contain p-4" />
                        ) : (
                            <LBarClock />
                        )
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* MEDIA PLAYER CONTAINER (Moves between L-Bar and PiP) */}
      <motion.div
        layout
        initial={false}
        animate={isAdMode ? {
            // PiP Mode (Bottom Left)
            top: "calc(75% - 32px)", 
            left: "32px",
            right: "calc(75% - 32px)", 
            bottom: "32px",
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            zIndex: 50
        } : {
            // L-Bar Mode
            top: "16px",
            left: "16px",
            right: "calc(32px + clamp(350px, 30%, 500px))", 
            bottom: "128px", 
            borderRadius: "12px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            zIndex: 30
        }}
        transition={{ 
            type: "spring", 
            stiffness: 70, 
            damping: 14, 
            mass: 1.1 
        }}
        className="absolute bg-black overflow-hidden border border-white/10"
      >
           {/* Live Badge */}
           <div className={cn(
               "absolute bg-[#FF0000] rounded text-white font-bold uppercase flex items-center gap-2 z-20 pointer-events-none shadow-md transition-all duration-700 ease-in-out",
               isAdMode ? "top-3 left-3 px-2 py-0.5 text-[10px]" : "top-4 left-4 px-3 py-1 text-xs"
           )}>
              <span className={cn("bg-white rounded-full animate-pulse", isAdMode ? "w-1.5 h-1.5" : "w-2 h-2")}/> Ao Vivo
           </div>
           
           {/* Logo Overlay (If Remote Mode is Active) */}
           {!isAdMode && remoteUrl && logoUrl && (
               <div className="absolute bottom-4 right-4 z-40 opacity-80 pointer-events-none">
                  <img src={logoUrl} className="h-12 w-auto object-contain drop-shadow-md" />
               </div>
           )}

           <div className="w-full h-full relative">
              {children || (
                  <div className="absolute inset-0 flex items-center justify-center text-white/30">
                     <span className="animate-pulse">Aguardando mídia...</span>
                  </div>
              )}
           </div>
      </motion.div>

      {/* FULLSCREEN LOGO OVERLAY (Ad Mode Only) - Keeps existing behavior */}
      <div 
         className={cn(
             "absolute bottom-8 right-8 w-24 h-24 z-50 transition-all duration-500 delay-200",
             isAdMode ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
         )}
      >
         {logoUrl && <img src={logoUrl} className="w-full h-full object-contain drop-shadow-lg" />}
      </div>

    </div>
  );
};

// Clock helper for L-Bar
export const LBarClock = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    return (
        <div className="text-center">
            <div className="text-6xl font-bold text-white tracking-tighter leading-none">
                {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm text-gray-400 uppercase font-medium mt-1">Hora Certa</div>
        </div>
    );
};

export const MenuBoardTemplate = ({ children }: PlayerTemplateProps) => (
  <div className="w-full h-full bg-[#1a1a1a] text-white p-10 flex flex-col font-sans relative overflow-hidden box-border">
    {/* Decorative BG */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-[#F9C846]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
    
    {/* Background Media (Low opacity) if needed, or we just display the content on top */}
    <div className="absolute inset-0 opacity-10 pointer-events-none">
       {children}
    </div>

    <div className="text-center mb-10 relative z-10">
      <h2 className="text-4xl font-bold text-[#F9C846] uppercase tracking-[0.2em] border-b-2 border-[#F9C846] inline-block pb-2">Burgers & Beers</h2>
    </div>
    
    <div className="grid grid-cols-2 gap-16 h-full relative z-10 overflow-auto">
       <div className="space-y-8">
          <h3 className="text-2xl font-bold text-[#006CFF] flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6" /> Clássicos
          </h3>
          <div className="space-y-6">
            {[1,2,3].map(i => (
                <div key={i} className="group">
                <div className="flex justify-between items-baseline mb-1 border-b border-white/10 pb-1">
                    <h4 className="font-bold text-xl group-hover:text-[#F9C846] transition-colors">Super Cheddar {i}</h4>
                    <span className="text-2xl font-bold text-[#F9C846]">R$ 32</span>
                </div>
                <p className="text-sm text-gray-400">180g carne angus, cheddar inglês, cebola caramelizada no pão brioche.</p>
                </div>
            ))}
          </div>
       </div>
       
       <div className="space-y-8">
          <h3 className="text-2xl font-bold text-[#006CFF] flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6" /> Bebidas
          </h3>
          <div className="space-y-6">
            {[1,2,3].map(i => (
                <div key={i} className="flex justify-between items-baseline border-b border-white/10 pb-2">
                    <div>
                        <h4 className="font-bold text-xl">Craft Beer IPA {i}</h4>
                        <p className="text-sm text-gray-400">Pint 500ml • 6.5% ABV</p>
                    </div>
                    <span className="text-2xl font-bold text-[#F9C846]">R$ 18</span>
                </div>
            ))}
          </div>
          
          <div className="mt-8 bg-gradient-to-r from-[#006CFF]/20 to-transparent p-6 rounded-xl border-l-4 border-[#006CFF] flex items-center gap-4">
             <div className="bg-[#006CFF] p-3 rounded-full text-white">
                <UtensilsCrossed className="h-6 w-6" />
             </div>
             <div>
                <p className="text-sm text-gray-300 uppercase tracking-wider font-bold">Oferta do Dia</p>
                <p className="text-lg">Combo Burger + Chopp por apenas <span className="text-[#F9C846] font-bold text-2xl">R$ 45</span></p>
             </div>
          </div>
       </div>
    </div>
  </div>
);

export const EventsTemplate = ({ children }: PlayerTemplateProps) => (
  <div className="w-full h-full bg-gradient-to-br from-[#0F1C2E] to-[#1a2c42] text-white p-0 flex font-sans box-border">
    {/* Optional: Use media as a dynamic sidebar or background */}
    <div className="w-[35%] bg-black/20 p-10 flex flex-col justify-center border-r border-white/5 relative overflow-hidden">
       {/* Use children (media) here as background for the sidebar? or just keep it static */}
       <div className="absolute inset-0 opacity-30 z-0">
          {children}
       </div>
       <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#0F1C2E]/90 via-[#0F1C2E]/60 to-[#0F1C2E]/90 z-10" />

       <div className="relative z-20">
          <div className="w-full h-2 bg-gradient-to-r from-purple-500 to-blue-500 mb-8" />
          <h2 className="text-5xl font-bold mb-2 tracking-tight">AGENDA</h2>
          <h3 className="text-3xl text-blue-400 font-light uppercase tracking-widest mb-8">Da Semana</h3>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-white/5 rounded-lg">
                    <Info className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                    <h4 className="font-bold text-sm uppercase text-gray-400">Couvert Artístico</h4>
                    <p className="text-lg">R$ 15,00</p>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <div className="p-2 bg-white/5 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                    <h4 className="font-bold text-sm uppercase text-gray-400">Reservas</h4>
                    <p className="text-lg">(11) 99999-9999</p>
                </div>
            </div>
          </div>
       </div>
    </div>
    
    <div className="flex-1 p-10 flex flex-col justify-center gap-4 relative z-10">
       {[
         { day: "SEX", date: "13 DEZ", title: "Rock Night", sub: "Banda The Classics", time: "21:00", color: "bg-purple-600" },
         { day: "SÁB", date: "14 DEZ", title: "Samba Raiz", sub: "Grupo Revelação Cover", time: "16:00", color: "bg-yellow-500" },
         { day: "DOM", date: "15 DEZ", title: "Futebol Ao Vivo", sub: "Final do Campeonato", time: "18:00", color: "bg-green-600" },
       ].map((evt, i) => (
         <div key={i} className="bg-white/5 rounded-2xl p-6 flex items-center gap-8 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all group">
            <div className={cn("rounded-xl p-4 text-center min-w-[100px] shadow-lg", evt.color)}>
               <div className="text-sm font-bold opacity-90 uppercase tracking-wider">{evt.day}</div>
               <div className="text-3xl font-black leading-none mt-1">{evt.date.split(' ')[0]}</div>
            </div>
            <div className="flex-1">
               <h4 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">{evt.title}</h4>
               <div className="flex items-center gap-2 mt-1">
                   <Music className="h-4 w-4 text-gray-400" />
                   <p className="text-gray-300">{evt.sub}</p>
               </div>
            </div>
            <div className="text-right bg-black/20 px-4 py-2 rounded-lg">
               <div className="text-2xl font-bold text-white">{evt.time}</div>
            </div>
         </div>
       ))}
    </div>
  </div>
);

export const SplitTemplate = ({ children }: PlayerTemplateProps) => (
  <div className="w-full h-full flex bg-white font-sans box-border">
    <div className="w-[55%] h-full relative overflow-hidden bg-black">
      {/* Media Player Slot */}
      <div className="w-full h-full absolute inset-0">
         {children}
      </div>
      <div className="absolute top-8 left-8 bg-[#F9C846] text-black font-black px-6 py-3 text-xl rounded-lg shadow-xl transform -rotate-2 z-20">
        NOVIDADE
      </div>
    </div>
    <div className="w-[45%] h-full flex flex-col justify-center p-16 bg-white text-[#0F1C2E]">
       <div className="w-16 h-1 bg-[#006CFF] mb-8" />
       <h2 className="text-6xl font-black mb-6 leading-tight tracking-tight">Pizza <br/><span className="text-[#006CFF]">Napolitana</span></h2>
       <p className="text-xl text-gray-500 mb-10 leading-relaxed font-light">
         Massa de fermentação natural por 48h, molho de tomate San Marzano D.O.P., mozzarella de búfala fresca e manjericão orgânico da nossa horta.
       </p>
       <div className="flex items-center gap-8 border-t border-gray-100 pt-8">
          <div>
             <p className="text-xs text-gray-400 uppercase font-bold mb-1">Preço</p>
             <div className="text-5xl font-bold text-[#006CFF]">R$ 58</div>
          </div>
          <div className="h-12 w-px bg-gray-200" />
          <div>
             <p className="text-xs text-gray-400 uppercase font-bold mb-1">Tamanho</p>
             <div className="text-lg font-medium text-gray-900">Grande (8 fatias)</div>
             <div className="text-sm text-gray-500">Serve 2-3 pessoas</div>
          </div>
       </div>
       <button className="mt-12 bg-[#0F1C2E] text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-[#006CFF] transition-colors shadow-lg w-full">
         Pedir Agora
       </button>
    </div>
  </div>
);
