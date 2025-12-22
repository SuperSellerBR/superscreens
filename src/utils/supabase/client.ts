import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "./info";

const supabaseUrl = `https://${projectId}.supabase.co`;

// Singleton Supabase Client for the browser
export const supabase = createClient(supabaseUrl, publicAnonKey);
