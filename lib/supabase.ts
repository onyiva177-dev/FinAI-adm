import { createBrowserClient } from '@supabase/ssr'

// ─────────────────────────────────────────────────────────────────
// ONLY EDIT LINE 8 — paste your anon key from:
// Supabase Dashboard → Your Project → Settings → API → anon public
// ─────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://ubswompebgkwpohwhaij.supabase.co'
const SUPABASE_ANON = 'PASTE_YOUR_ANON_KEY_HERE'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
}
