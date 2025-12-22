import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../utils/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner@2.0.3";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAuthorized(false);
        return;
      }

      const role = session.user.user_metadata?.role;
      if (role === 'admin') {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
        toast.error("Acesso não autorizado. Apenas administradores podem acessar esta página.");
      }
    }

    checkAuth();
  }, []);

  if (isAuthorized === null) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0F1C2E]">
        <Loader2 className="h-8 w-8 animate-spin text-[#006CFF]" />
      </div>
    );
  }

  if (!isAuthorized) {
    // If logged in but not admin, maybe redirect to dashboard instead of login?
    // But if not logged in, login is correct.
    // Let's assume if fails, we go to dashboard if session exists, or login if not.
    // Simpler: Redirect to dashboard (which everyone has access to)
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}
