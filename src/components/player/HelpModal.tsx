import { 
    ArrowLeft, Maximize, Shuffle, Newspaper, Repeat, Volume2, 
    Smartphone, QrCode, LayoutTemplate, Square, Columns 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-7xl bg-slate-950 border-slate-800 text-white p-0 overflow-hidden max-h-[90vh] flex flex-col w-full h-[85vh]">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-white/10 bg-slate-900/50 shrink-0">
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-lg">?</span> 
                    Guia do Player
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-base">
                    Entenda os controles e funcionalidades da sua TV.
                </DialogDescription>
            </DialogHeader>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
            <div className="flex flex-col lg:flex-row gap-12 h-full">
            
                {/* Coluna Esquerda: Interface do Player */}
                <div className="flex-1 space-y-8 lg:overflow-y-auto lg:pr-4">
                    {/* Seção 1: Botões da Tela */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2 border-b border-blue-500/20 pb-2">
                            <LayoutTemplate className="w-5 h-5" /> Botões de Controle
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <ControlItem 
                                icon={<ArrowLeft className="w-5 h-5" />} 
                                label="Sair" 
                                desc="Volta para o menu." 
                            />
                            <ControlItem 
                                icon={<Maximize className="w-5 h-5" />} 
                                label="Tela Cheia" 
                                desc="Expande o player." 
                            />
                            <ControlItem 
                                icon={<Shuffle className="w-5 h-5" />} 
                                label="Aleatório" 
                                desc="Mistura vídeos." 
                            />
                            <ControlItem 
                                icon={<Newspaper className="w-5 h-5" />} 
                                label="Notícias" 
                                desc="Barra de rodapé." 
                            />
                            <ControlItem 
                                icon={<Repeat className="w-5 h-5" />} 
                                label="Layout" 
                                desc="Muda a visualização." 
                            />
                            <ControlItem 
                                icon={<Volume2 className="w-5 h-5" />} 
                                label="Som" 
                                desc="Liga/Desliga áudio." 
                            />
                        </div>
                    </section>

                    {/* Seção 2: Layouts Visuais */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2 border-b border-emerald-500/20 pb-2">
                            <Square className="w-5 h-5" /> Entendendo os Layouts
                        </h3>
                        <div className="grid gap-4">
                            <div className="flex gap-4 items-center p-4 rounded-lg bg-slate-900/40 border border-slate-800">
                                <Columns className="w-10 h-10 text-emerald-500 shrink-0" />
                                <div>
                                    <strong className="text-white block text-base">Barra Lateral (L-Bar)</strong>
                                    <p className="text-slate-400 text-sm">
                                        Vídeo + QR Code + Anúncios. Melhor para engajamento.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4 items-center p-4 rounded-lg bg-slate-900/40 border border-slate-800">
                                <Maximize className="w-10 h-10 text-emerald-500 shrink-0" />
                                <div>
                                    <strong className="text-white block text-base">Tela Cheia</strong>
                                    <p className="text-slate-400 text-sm">
                                        Vídeo em 100% da tela. Foco total no conteúdo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Separator Vertical (Desktop) */}
                <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent mx-2" />

                {/* Coluna Direita: Modos de Interação */}
                <div className="flex-1 space-y-6 flex flex-col">
                    <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2 border-b border-purple-500/20 pb-2 shrink-0">
                        <Smartphone className="w-5 h-5" /> Como Controlar
                    </h3>
                    
                    <div className="grid gap-6 flex-1">
                        {/* Card Controle Remoto */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 hover:bg-slate-900/60 hover:border-purple-500/30 transition-all group">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                                    <Smartphone className="w-8 h-8" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">Controle Remoto</h4>
                                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase tracking-wide font-bold">Lojista</span>
                                    </div>
                                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                                        Painel administrativo completo. Gerencie o que está tocando sem estar perto da TV.
                                    </p>
                                    <div className="bg-black/30 rounded-lg p-3 text-xs text-slate-400 border border-white/5">
                                        <span className="text-purple-400 font-semibold">Acesso:</span> Dashboard &gt; Botão "Controle Remoto"
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card Jukebox */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 hover:bg-slate-900/60 hover:border-pink-500/30 transition-all group">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400 group-hover:scale-110 transition-transform">
                                    <QrCode className="w-8 h-8" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors">Jukebox</h4>
                                        <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded border border-pink-500/30 uppercase tracking-wide font-bold">Clientes</span>
                                    </div>
                                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                                        Interatividade para o público. Os clientes escolhem os próximos vídeos.
                                    </p>
                                    <div className="bg-black/30 rounded-lg p-3 text-xs text-slate-400 border border-white/5">
                                        <span className="text-pink-400 font-semibold">Uso:</span> Ler QR Code na tela da TV
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-900 border-t border-white/10 flex justify-end shrink-0">
            <Button onClick={() => onOpenChange(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-6 text-lg shadow-lg shadow-blue-900/20">
                Entendi, voltar para TV
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ControlItem({ icon, label, desc }: { icon: React.ReactNode, label: string, desc: string }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/40 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
            <div className="p-2 bg-slate-950 rounded-full text-slate-200 shadow-sm shrink-0">
                {icon}
            </div>
            <div>
                <h4 className="text-sm font-bold text-white leading-none mb-1.5 mt-0.5">{label}</h4>
                <p className="text-xs text-slate-400 leading-snug">{desc}</p>
            </div>
        </div>
    )
}
