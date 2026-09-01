import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- supabase client
const SUPABASE_URL = "https://dsyvlavphvrdidmodokd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzeXZsYXZwaHZyZGlkbW9kb2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzI5NjMsImV4cCI6MjA4MTg0ODk2M30.mLmyZMUPtCaQl5Vck-Y7nImDFQuVWN_Mk6PrE-miP2E";

// create supabase client
export const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
