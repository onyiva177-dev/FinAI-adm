import { createBrowserClient } from '@supabase/ssr'

// ─────────────────────────────────────────────────────────────────
// ONLY EDIT LINE 8 — paste your anon key from:
// Supabase Dashboard → Your Project → Settings → API → anon public
// ─────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://ubswxmpebqkwpohwhaij.supabase.co/rest/v1/'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVic3d4bXBlYnFrd3BvaHdoYWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODQwNjIsImV4cCI6MjA4ODA2MDA2Mn0.1DUqqySFdehceHA2hURExEHEd7qdJxhAMSnz3GKYp6k'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
}
