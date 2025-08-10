import { createClient } from '@supabase/supabase-js';

export const supaAdmin = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

export const supaAnon = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: true }
  });

/** APIルートでBearerトークンからユーザーを取得 */
export async function getUserFromRequest(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const supa = supaAnon();
  const { data: { user }, error } = await supa.auth.getUser(token);
  if (error) return null;
  return user;
}
