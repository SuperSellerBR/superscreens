/**
 * Supabase env config
 * - Reads from Vite env (Vercel) and falls back to hardcoded keys for local/dev if not provided.
 * - For production, always set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in the environment.
 */

const envUrl = import.meta?.env?.VITE_SUPABASE_URL;
const envAnon = import.meta?.env?.VITE_SUPABASE_ANON_KEY;

export const supabaseUrl = envUrl || "https://gybrnkgfbuglplknkzmi.supabase.co";
export const publicAnonKey =
  envAnon ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5YnJua2dmYnVnbHBsa25rem1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTAwNTcsImV4cCI6MjA4MTc4NjA1N30.P1eibrFkG8dqorRHDBWW9w3FK1fpfj3j0n2Vo6B3Jms";
