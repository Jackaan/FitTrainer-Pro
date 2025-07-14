import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://demo.supabase.co"
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "service-role-key"

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
