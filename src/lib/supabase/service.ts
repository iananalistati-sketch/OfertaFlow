import { createClient } from '@supabase/supabase-js';

export function offerflowServerDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server configuration missing');
  return createClient(url, key, {
    auth: { autoRefreshToken:false, persistSession:false, detectSessionInUrl:false },
  });
}
