import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase/client";

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getRole() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
           setUser(session.user);
           setRole(session.user.user_metadata?.role || 'client');
        } else {
           setUser(null);
           setRole(null);
        }
      } catch (e) {
        console.error("Error getting role", e);
        setRole(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    getRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setRole(session.user.user_metadata?.role || 'client');
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { role, loading, isAdmin: role === 'admin', user };
}
