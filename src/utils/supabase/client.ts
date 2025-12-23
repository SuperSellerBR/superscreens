import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, publicAnonKey } from "./info";

// Singleton Supabase Client for the browser
export const supabase = createClient(supabaseUrl, publicAnonKey);
