import { 
  Home,
  LayoutDashboard, 
  Image as ImageIcon, 
  ListVideo, 
  Users, 
  BarChart3, 
  Tv, 
  Network, 
  LogOut, 
  Settings,
  Menu,
  Megaphone,
  Store,
  Info
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "../ui/sheet";
import { supabase } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { useUserRole } from "../../hooks/useUserRole";
import { ModeToggle } from "../mode-toggle";

const MENU_ITEMS = [
  { label: "Início", icon: Home, path: "/client/home", roles: ['client'] },
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard", roles: ['admin', 'advertiser'] },
  { label: "Gerenciador de Conteúdos", icon: ImageIcon, path: "/admin/content", roles: ['admin', 'client', 'advertiser'] },
  { label: "Criador de Playlist", icon: ListVideo, path: "/admin/playlist", roles: ['admin', 'client', 'advertiser'] },
  { label: "Usuários", icon: Users, path: "/admin/users", roles: ['admin'] },
  { label: "Gestão de Mídias", icon: Megaphone, path: "/admin/advertisers", roles: ['admin', 'advertiser'] },
  { label: "Distribuição", icon: Store, path: "/admin/advertise", roles: ['admin'] },
  { label: "Meus Anunciantes", icon: Store, path: "/admin/my-advertisers", roles: ['client'] },
  { label: "O que é?", icon: Info, path: "/admin/about", roles: ['admin', 'client', 'advertiser'] },
  { label: "Configurações", icon: Settings, path: "/admin/settings", roles: ['admin', 'client', 'advertiser'] }, // Partially visible
  { label: "Arquitetura (Backend)", icon: Network, path: "/admin/architecture", roles: ['admin'] },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, loading } = useUserRole();

  const handleOpenPlayer = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      // Check if fullscreen is supported and allowed
      if (
        document.fullscreenEnabled && 
        !document.fullscreenElement && 
        document.documentElement.requestFullscreen
      ) {
        await document.documentElement.requestFullscreen();
      }
      
      if (userId) {
         navigate(`/player?uid=${userId}`);
      } else {
         navigate('/player');
      }
    } catch (err) {
      console.log("Fullscreen request failed (likely due to environment restrictions). Proceeding to player.");
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (userId) {
         navigate(`/player?uid=${userId}`);
      } else {
         navigate('/player');
      }
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error: any) {
      if (error.message?.includes('Auth session missing')) {
        // Session already gone, just redirect
        navigate('/login');
        return;
      }
      console.error("Error logging out:", error);
      toast.error("Erro ao sair");
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#0F1C2E] dark:bg-slate-900 text-white border-r border-white/10 dark:border-gray-800 transition-colors duration-300">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#006CFF]">
          Super<span className="text-white">Screens</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">Admin Panel MVP</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {MENU_ITEMS.map((item) => {
          // Check role visibility
          if (!loading && role && !item.roles.includes(role)) {
             return null;
          }

          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#006CFF] text-white shadow-md"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-4">
         <div className="flex items-center justify-between px-3">
             <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tema</span>
             <ModeToggle />
         </div>

         <div className="px-3 py-2">
           <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
             Atalhos do Player
           </h3>
           <div className="space-y-1">
            <button 
              onClick={handleOpenPlayer} 
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-[#F9C846] w-full text-left"
            >
              <Tv className="h-4 w-4" /> Abrir Player TV
            </button>
           </div>
         </div>
         
         <Button 
          variant="ghost" 
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
}

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden text-white">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 bg-[#0F1C2E] dark:bg-slate-900 border-r border-white/10 dark:border-gray-800 w-64">
        <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
        <SheetDescription className="sr-only">
          Navegue pelas opções do sistema.
        </SheetDescription>
        <AdminSidebar />
      </SheetContent>
    </Sheet>
  );
}
