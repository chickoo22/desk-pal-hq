import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, requireServiceRole } from "./env";

// Service-role client: bypasses RLS and can use the Auth admin API. Server-only.
export function adminClient(): SupabaseClient {
  const key = requireServiceRole();
  return createClient(env.SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Anon client signed in as a real user — exercises the same RLS/defaults/triggers as the app.
export async function userClient(email: string, password: string): Promise<SupabaseClient> {
  const c = createClient(env.SUPABASE_URL, env.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`userClient sign-in failed for ${email}: ${error.message}`);
  return c;
}

export async function createConfirmedUser(
  admin: SupabaseClient,
  email: string,
  password: string,
  metadata: Record<string, string>,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw new Error(`createUser(${email}) failed: ${error.message}`);
  return data.user!.id;
}

export async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  // listUsers is paginated; scan a few pages for our test accounts.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

export async function deleteUser(admin: SupabaseClient, id: string): Promise<void> {
  await admin.auth.admin.deleteUser(id);
}
