import { cn } from "@/lib/utils";
import { Monitor, Calendar, Music, UtensilsCrossed, Info } from "lucide-react";

export const FullscreenPreview = () => (
  <div className="w-full h-full relative overflow-hidden bg-black">
    <img 
      src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80" 
      className="w-full h-full object-cover opacity-80" 
      alt="Fullscreen"
    />
    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent p-12">
      <h2 className="text-white text-4xl font-bold">Oferta Especial de Verão</h2>
      <p className="text-white/90 text-2xl mt-2 font-light">Na compra de 2 burgers, o 3º é por nossa conta!</p>
      <div className="mt-6 inline-block bg-[#006CFF] text-white px-6 py-2 rounded-full font-medium">
        Apenas hoje
      </div>
    </div>
  </div>
);

export const LBarPreview = () => (
  <div className="w-full h-full bg-[#0F1C2E] p-4 grid grid-cols-[1fr_300px] grid-rows-[1fr_80px] gap-4 font-sans">
    {/* Video Area */}
    <div className="bg-black rounded-xl relative overflow-hidden border border-white/10 flex items-center justify-center shadow-2xl">
      <div className="text-center">
        <Monitor className="h-12 w-12 text-white/20 mx-auto mb-2" />
        <span className="text-white/50 font-medium animate-pulse">Sinal de TV / HDMI</span>
      </div>
      <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-md text-xs text-white font-bold uppercase flex items-center gap-2">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse"/> Ao Vivo
      </div>
    </div>
    
    {/* Sidebar Ads */}
    <div className="bg-[#1a2c42] rounded-xl p-4 flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Patrocínio</h3>
      </div>
      <div className="flex-1 bg-black/20 rounded-lg overflow-hidden relative">
         <img src="https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=400&q=80" className="w-full h-full object-cover opacity-90" alt="Ad" />
      </div>
      <div className="bg-white p-3 rounded-lg text-center flex flex-col items-center gap-2">
        <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=demo`}
            alt="QR Code"
            className="w-20 h-20"
        />
        <span className="text-[10px] font-bold text-[#0F1C2E] uppercase">Escaneie para Promo</span>
      </div>
    </div>

    {/* Bottom Ticker */}
    <div className="col-span-2 bg-[#006CFF] rounded-xl flex items-center overflow-hidden shadow-lg relative">
      <div className="bg-[#0050bd] h-full px-8 flex items-center justify-center z-10 font-bold text-white text-lg uppercase tracking-wider shadow-xl">
        Notícias
      </div>
      <div className="flex-1 px-6">
        <div className="text-white font-medium text-lg truncate">
          SuperScreens News • Promoção válida até as 22h • Próximo jogo: Brasil vs Argentina às 21:00 • Peça pelo app e ganhe desconto
        </div>
      </div>
    </div>
  </div>
);

export const MenuBoardPreview = () => (
  <div className="w-full h-full bg-[#1a1a1a] text-white p-10 flex flex-col font-sans relative overflow-hidden">
    {/* Decorative BG */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-[#F9C846]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

    <div className="text-center mb-10 relative z-10">
      <h2 className="text-4xl font-bold text-[#F9C846] uppercase tracking-[0.2em] border-b-2 border-[#F9C846] inline-block pb-2">Burgers & Beers</h2>
    </div>
    
    <div className="grid grid-cols-2 gap-16 h-full relative z-10">
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

export const EventsPreview = () => (
  <div className="w-full h-full bg-gradient-to-br from-[#0F1C2E] to-[#1a2c42] text-white p-0 flex font-sans">
    <div className="w-[35%] bg-black/20 p-10 flex flex-col justify-center border-r border-white/5 relative overflow-hidden">
       <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-blue-500" />
       
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
    <div className="flex-1 p-10 flex flex-col justify-center gap-4">
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

export const SplitScreenPreview = () => (
  <div className="w-full h-full flex bg-white font-sans">
    <div className="w-[55%] h-full relative overflow-hidden">
      <img 
        src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=80" 
        className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
        alt="Pizza"
      />
      <div className="absolute top-8 left-8 bg-[#F9C846] text-black font-black px-6 py-3 text-xl rounded-lg shadow-xl transform -rotate-2">
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