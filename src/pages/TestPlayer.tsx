import { useState, useEffect, useRef, useCallback } from "react";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import ReactPlayer from "react-player";
import { Loader2, AlertTriangle, CheckCircle, Play, SkipForward } from "lucide-react";

// --- Types ---
interface PlaylistItem {
  id: string;
  title: string;
  type: 'video' | 'image' | 'ad' | 'youtube';
  duration: number;
  url?: string;
}

export default function TestPlayer() {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  // 1. Load Playlist
  useEffect(() => {
    const fetchPlaylist = async () => {
      addLog("Iniciando fetch da playlist...");
      try {
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/playlist/active`, {
           headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });
        
        if (!res.ok) throw new Error(`Status HTTP: ${res.status}`);

        const data = await res.json();
        addLog(`Resposta recebida. Items: ${data.playlist?.length || 0}`);

        if (data.playlist && Array.isArray(data.playlist)) {
           const validItems = data.playlist.filter((i: any) => i.url);
           setPlaylist(validItems);
           addLog(`Items válidos (com URL): ${validItems.length}`);
           if (validItems.length === 0) setError("Playlist vazia ou sem URLs válidas");
        } else {
           setError("Formato de playlist inválido");
        }
      } catch (err: any) {
        console.error("Fetch error", err);
        setError(`Erro de conexão: ${err.message}`);
        addLog(`ERRO FATAL: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylist();
  }, []);

  const handleNext = useCallback(() => {
    if (playlist.length === 0) return;
    addLog("Avancando para proximo item...");
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  }, [playlist.length]);

  if (isLoading) {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p>Carregando dados da playlist...</p>
        <div className="mt-4 text-xs text-gray-500 max-w-md bg-zinc-900 p-4 rounded">
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-black text-red-500 flex flex-col items-center justify-center font-mono p-8 text-center">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <h1 className="text-xl font-bold mb-2">Erro Crítico</h1>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-8 px-4 py-2 bg-red-900/50 rounded hover:bg-red-900 text-white"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const currentItem = playlist[currentIndex];

  return (
    <div className="h-screen w-screen bg-black flex relative overflow-hidden">
      
      {/* --- Main Player Area (80% width) --- */}
      <div className="flex-1 relative bg-zinc-950 flex items-center justify-center">
        {currentItem ? (
          <TestMediaItem 
            key={currentItem.id} // Important: Force remount
            item={currentItem} 
            onComplete={handleNext}
            log={addLog}
          />
        ) : (
          <div className="text-gray-500">Nenhum item para reproduzir</div>
        )}
      </div>

      {/* --- Debug Sidebar (20% width) --- */}
      <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col font-mono text-xs z-50">
        <div className="p-4 border-b border-zinc-800 bg-zinc-800/50">
          <h2 className="font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            Diagnóstico
          </h2>
        </div>

        {/* Current Item Stats */}
        <div className="p-4 border-b border-zinc-800 space-y-2">
          <div className="text-zinc-400">Item Atual ({currentIndex + 1}/{playlist.length})</div>
          <div className="bg-black p-2 rounded text-green-400 break-all">
            <span className="text-zinc-500 block text-[10px] uppercase">Título</span>
            {currentItem?.title}
          </div>
          <div className="bg-black p-2 rounded text-blue-400 break-all">
            <span className="text-zinc-500 block text-[10px] uppercase">Tipo</span>
            {currentItem?.type}
          </div>
          <div className="bg-black p-2 rounded text-yellow-400 break-all">
            <span className="text-zinc-500 block text-[10px] uppercase">URL</span>
            {currentItem?.url}
          </div>
           <div className="bg-black p-2 rounded text-purple-400 break-all">
            <span className="text-zinc-500 block text-[10px] uppercase">Duração Configurada</span>
            {currentItem?.duration}s
          </div>
          
          <button 
            onClick={handleNext}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            <SkipForward className="w-4 h-4" />
            Forçar Próximo
          </button>
        </div>

        {/* Console Logs */}
        <div className="flex-1 overflow-auto p-4 space-y-1 bg-black/50">
          {logs.map((log, i) => (
            <div key={i} className="text-zinc-300 border-l-2 border-zinc-700 pl-2">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Isolated Media Component for Test ---
function TestMediaItem({ item, onComplete, log }: { item: PlaylistItem, onComplete: () => void, log: (m: string) => void }) {
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  // Auto-advance for images
  useEffect(() => {
    if (item.type === 'image') {
      log(`Imagem detectada. Timer iniciado: ${item.duration}s`);
      const timer = setTimeout(() => {
        log("Timer de imagem concluído.");
        onComplete();
      }, (item.duration || 10) * 1000);
      return () => clearTimeout(timer);
    }
  }, [item]);

  if (item.type === 'image') {
    return (
      <img 
        src={item.url} 
        className="w-full h-full object-contain"
        alt="Test Content"
        onLoad={() => log("Imagem carregada no DOM")}
        onError={() => {
          log(`ERRO ao carregar imagem: ${item.url}`);
          setTimeout(onComplete, 2000);
        }}
      />
    );
  }

  return (
    <div className="w-full h-full bg-black relative">
       {/* Progress Bar */}
       <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 z-10">
          <div 
            className="h-full bg-blue-500 transition-all duration-300" 
            style={{ width: `${(progress / (duration || 1)) * 100}%` }}
          />
       </div>

       <ReactPlayer
          url={item.url}
          playing={isReady}
          muted={true}
          width="100%"
          height="100%"
          onReady={() => {
            log("Player: onReady disparado");
            // Delay safe start
            setTimeout(() => {
               log("Player: Iniciando reprodução (playing=true)");
               setIsReady(true);
            }, 500);
          }}
          onStart={() => log("Player: onStart (reprodução iniciada)")}
          onBuffer={() => log("Player: Buffering...")}
          onDuration={(d) => {
            setDuration(d);
            log(`Metadados: Duração real detectada: ${d}s`);
          }}
          onProgress={(p) => setProgress(p.playedSeconds)}
          onEnded={() => {
            log("Player: onEnded. Chamando próximo...");
            onComplete();
          }}
          onError={(e: any) => {
             // Basic AbortError check
             const msg = typeof e === 'string' ? e : e?.message || '';
             if (msg.includes('AbortError') || msg.includes('interrupted')) {
               log("Aviso: AbortError ignorado (navegação rápida)");
               return;
             }
             log(`ERRO DE MÍDIA: ${msg}`);
             console.error(e);
          }}
          config={{
            youtube: {
              playerVars: { autoplay: 0, controls: 1, showinfo: 1 }
            },
            file: {
              attributes: { autoPlay: false, muted: true }
            }
          }}
       />
    </div>
  );
}