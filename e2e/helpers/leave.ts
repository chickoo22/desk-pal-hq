import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, userClient } from "./admin";
import { readSeed, type SeededUser } from "./seed";

function futureDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function casualPolicyId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.from("leave_policies").select("id").eq("code", "casual").limit(1).maybeSingle();
  if (error || !data) throw new Error(`casual policy not found: ${error?.message}`);
  return data.id as string;
}

// Apply for leave exactly as the app does (anon client as the user → RLS + defaults + triggers fire).
// Returns the new request id. startOffset defaults to 7 days out, 2-day leave.
export async function applyLeaveAsUser(
  who: SeededUser,
  opts: { startOffset?: number; days?: number; reason?: string } = {},
): Promise<string> {
  const seed = readSeed();
  const c = await userClient(who.email, seed.password);
  const policyId = await casualPolicyId(c);
  const start = futureDate(opts.startOffset ?? 7);
  const end = futureDate((opts.startOffset ?? 7) + ((opts.days ?? 2) - 1));
  const { data, error } = await c
    .from("leave_requests")
    .insert({
      user_id: who.userId,
      policy_id: policyId,
      start_date: start,
      end_date: end,
      day_portion: "full_day",
      reason: opts.reason ?? "E2E generated request",
      is_public: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`applyLeave failed for ${who.email}: ${error.message}`);
  return data.id as string;
}

export interface LeaveRow {
  status: string;
  manager_status: string;
  hr_status: string;
}

export async function getLeaveRow(id: string): Promise<LeaveRow> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("leave_requests")
    .select("status, manager_status, hr_status")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as LeaveRow;
}

export async function getBalanceRemaining(userId: string, code = "casual"): Promise<number> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("leave_balances")
    .select("remaining_days, leave_policies:policy_id(code)")
    .eq("user_id", userId);
  if (error) throw error;
  const row = (data || []).find((b: { leave_policies?: { code?: string } }) => b.leave_policies?.code === code);
  return (row?.remaining_days as number) ?? -1;
}

// Latest notification title+message for a user (validates trigger fan-out).
export async function latestNotification(userId: string): Promise<string> {
  const admin = adminClient();
  const { data } = await admin
    .from("notifications")
    .select("title, message")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  const n = (data || [])[0];
  return n ? `${n.title} :: ${n.message}` : "";
}
