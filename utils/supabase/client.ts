import {
  supabase,
  supabaseUrl,
  supabaseKey,
  sanitizeSupabaseUrl,
  sanitizeSupabaseKey,
} from "../../src/lib/supabase";

// Re-eksport centralnog singleton klijenta kako bi se sprečile duple GoTrueClient instance
export { supabase, supabaseUrl, supabaseKey, sanitizeSupabaseUrl, sanitizeSupabaseKey };
export const createClient = () => supabase;
export default supabase;
