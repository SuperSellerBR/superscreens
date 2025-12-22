import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "../ui/button";
import { AdminSidebar, AdminMobileNav } from "./AdminSidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-[#F4F6F8] dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar Desktop */}
      <aside className="hidden md:block h-screen sticky top-0 z-30 w-64">
        <AdminSidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Mobile */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-[#0F1C2E] border-b border-white/10 sticky top-0 z-50">
          <div className="flex items-center">
            <AdminMobileNav />
            <div className="ml-4 font-bold text-white">SuperScreens</div>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate('/')}>
            <Home className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl space-y-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
