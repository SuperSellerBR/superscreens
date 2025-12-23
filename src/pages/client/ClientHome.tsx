import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase/client";
import { supabaseUrl, publicAnonKey } from "../../utils/supabase/info";
import { Tv, Smartphone, Settings, LogOut, Loader2, Play, ListVideo, ImageIcon, Store, Home, QrCode, Info, LayoutDashboard } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner@2.0.3";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

export default function ClientHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [showJukeboxQr, setShowJukeboxQr] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
      
      // Fetch Logo
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/logo?uid=${session.user.id}`, {
             headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });
        const data = await res.json();
        if (data.logoUrl) setLogoUrl(data.logoUrl);
      } catch (e) {
        console.error("Error fetching logo", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleOpenPlayer = async () => {
      try {
        if (
          document.fullscreenEnabled && 
          !document.fullscreenElement && 
          document.documentElement.requestFullscreen
        ) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.error("Fullscreen blocked", e);
      } finally {
        navigate(`/player?uid=${user.id}`);
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 mr-2" onClick={() => navigate('/')}>
               <Home className="w-5 h-5" />
            </Button>
            {logoUrl ? (
                <img src={logoUrl} className="h-10 md:h-12 object-contain" alt="Logo" />
            ) : (
                <span className="font-bold text-xl md:text-2xl tracking-tight text-slate-900 dark:text-white">SuperScreens</span>
            )}
            <div className="h-6 w-px bg-slate-300 dark:bg-white/10 mx-2 hidden md:block"></div>
            <span className="text-slate-500 dark:text-slate-400 text-sm hidden md:block">Painel do Cliente</span>
        </div>
        
        <Button 
            variant="ghost" 
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 gap-2"
            onClick={handleLogout}
        >
            <LogOut className="w-5 h-5" />
            <span className="hidden md:inline">Sair</span>
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-10">
         <div className="text-center space-y-2 max-w-lg">
             <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                Bem-vindo
             </h1>
             <p className="text-slate-500 dark:text-slate-400">Gerencie sua TV, controle a exibição ou altere suas configurações.</p>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
            {/* Player TV Button */}
            <HomeButton 
                className="hidden md:block"
                icon={Tv} 
                title="Player TV" 
                description="Abrir reprodutor em tela cheia"
                onClick={handleOpenPlayer}
                gradient="from-blue-600 to-blue-800"
                hoverBorder="group-hover:border-blue-500/50"
            />

            {/* Remote Control Button */}
            <HomeButton 
                icon={Smartphone} 
                title="Controle Remoto" 
                description="Comandar a TV pelo celular"
                onClick={() => navigate(`/admin/remote?uid=${user.id}`)}
                gradient="from-purple-600 to-purple-800"
                hoverBorder="group-hover:border-purple-500/50"
            />

            {/* Jukebox QR Code Button */}
            <HomeButton 
                icon={QrCode} 
                title="QR Code Jukebox" 
                description="Exibir para clientes"
                onClick={() => setShowJukeboxQr(true)}
                gradient="from-pink-600 to-pink-800"
                hoverBorder="group-hover:border-pink-500/50"
            />

            {/* Playlist Builder */}
             <HomeButton 
                icon={ListVideo} 
                title="Playlist" 
                description="Organizar grade de programação"
                onClick={() => navigate('/admin/playlist')}
                gradient="from-emerald-600 to-emerald-800"
                hoverBorder="group-hover:border-emerald-500/50"
            />

            {/* Dashboard */}
            <HomeButton 
               icon={LayoutDashboard} 
               title="Dashboard" 
               description="Ver métricas e eventos"
               onClick={() => navigate('/admin/dashboard')}
               gradient="from-blue-600 to-blue-800"
               hoverBorder="group-hover:border-blue-500/50"

            />

             {/* Content Manager */}
             <HomeButton 
                icon={ImageIcon} 
                title="Conteúdos" 
                description="Upload de vídeos e imagens"
                onClick={() => navigate('/admin/content')}
                gradient="from-pink-600 to-pink-800"
                hoverBorder="group-hover:border-pink-500/50"
            />

            {/* Advertisers */}
             <HomeButton 
                icon={Store} 
                title="Anunciantes" 
                description="Gerenciar parceiros"
                onClick={() => navigate('/admin/my-advertisers')}
                gradient="from-amber-600 to-amber-800"
                hoverBorder="group-hover:border-amber-500/50"
            />

             {/* About Button */}
             <HomeButton 
                icon={Info} 
                title="O que é?" 
                description="Conheça a plataforma"
                onClick={() => navigate('/admin/about')}
                gradient="from-cyan-600 to-cyan-800"
                hoverBorder="group-hover:border-cyan-500/50"
            />

            {/* Settings Button */}
            <HomeButton 
                icon={Settings} 
                title="Configurações" 
                description="Ajustes da conta e sistema"
                onClick={() => navigate('/admin/settings')}
                gradient="from-slate-700 to-slate-900"
                hoverBorder="group-hover:border-white/20"
            />
         </div>

         <Dialog open={showJukeboxQr} onOpenChange={setShowJukeboxQr}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="text-slate-900 dark:text-white">Jukebox QR Code</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Peça para seu cliente escanear este código para pedir músicas.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900/50 rounded-xl gap-4">
                     <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                         <QRCode
                            value={`${window.location.origin}/remote?uid=${user?.id}`}
                            size={200}
                            viewBox={`0 0 256 256`}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                         />
                     </div>
                     <p className="text-xs text-slate-400 text-center break-all">
                        {`${window.location.origin}/remote?uid=${user?.id}`}
                     </p>
                </div>
            </DialogContent>
         </Dialog>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-slate-500 dark:text-slate-600 text-sm">
        SuperScreens Digital Signage &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function HomeButton({ icon: Icon, title, description, onClick, gradient, iconBg, hoverBorder, highlightText, className }: any) {
    const borderHoverClass = hoverBorder || "group-hover:border-transparent";
    const iconBgClass = iconBg || `bg-gradient-to-br ${gradient}`;
    return (
        <button 
            onClick={onClick}
            className={`group relative overflow-hidden rounded-2xl p-1 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-900/20 active:scale-[0.98] ${className}`}
        >
            {/* Border Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            
            <div className={`relative h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-8 flex flex-col items-center text-center gap-6 transition-colors z-10 ${borderHoverClass}`}>
                <div className={`w-20 h-20 rounded-full ${iconBgClass} flex items-center justify-center shadow-lg mb-2 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-10 h-10 text-white" />
                </div>
                
                <div className="space-y-2">
                    <h3 className={`text-2xl font-bold text-slate-900 dark:text-white transition-colors ${highlightText || "group-hover:text-blue-600 dark:group-hover:text-blue-100"}`}>
                        {title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{description}</p>
                </div>

                <div className="mt-auto pt-4 opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900/80 dark:text-white/80">
                        Acessar <Play className="w-3 h-3 fill-current" />
                    </span>
                </div>
            </div>
        </button>
    )
}
