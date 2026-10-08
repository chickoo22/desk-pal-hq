import { writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, createConfirmedUser } from "./admin";

const SEED_FILE = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".seed.json");

export interface SeededUser {
  email: string;
  userId: string;
  profileId: string;
  role: string;
}
export interface Seed {
  runId: string;
  companyId: string;
  companyName: string;
  password: string;
  admin: SeededUser;
  hr: SeededUser;
  manager: SeededUser;
  emp1: SeededUser; // reports to manager
  emp2: SeededUser; // reports to manager
  emp3: SeededUser; // does NOT report to manager
}

export function readSeed(): Seed {
  if (!existsSync(SEED_FILE)) throw new Error("Seed file missing — did global setup run?");
  return JSON.parse(readFileSync(SEED_FILE, "utf8")) as Seed;
}

async function insertInvite(admin: SupabaseClient, companyId: string, role: string, code: string) {
  const { error } = await admin.from("company_invites").insert({ company_id: companyId, role, code });
  if (error) throw new Error(`insert invite (${role}) failed: ${error.message}`);
}

export async function buildSeed(): Promise<Seed> {
  const admin = adminClient();
  const runId = (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).toUpperCase();
  const password = `Dp!${runId}zX7q`;
  const companyName = `Acme E2E ${runId}`;
  const emailFor = (who: string) => `e2e.${runId}.${who}@deskpal-e2e.test`.toLowerCase();

  // 1. Admin + company (handle_new_user creates the company, policies, admin role).
  const adminEmail = emailFor("admin");
  const adminUserId = await createConfirmedUser(admin, adminEmail, password, {
    full_name: "Admin E2E",
    company_name: companyName,
  });

  const { data: company, error: cErr } = await admin
    .from("companies")
    .select("id")
    .eq("name", companyName)
    .maybeSingle();
  if (cErr || !company) throw new Error(`company not created: ${cErr?.message ?? "not found"}`);
  const companyId = company.id as string;

  // Make the company active and setup-complete so admin/hr land on the dashboard, not the wizard/suspended gate.
  await admin
    .from("companies")
    .update({ status: "active", setup_completed_at: new Date().toISOString() })
    .eq("id", companyId);

  // 2. Invites for the other roles, then confirmed users that redeem them.
  const defs: { who: string; role: string }[] = [
    { who: "hr", role: "hr" },
    { who: "manager", role: "manager" },
    { who: "emp1", role: "employee" },
    { who: "emp2", role: "employee" },
    { who: "emp3", role: "employee" },
  ];
  const users: Record<string, { email: string; userId: string }> = {};
  for (const d of defs) {
    const code = `${runId}${d.who.toUpperCase()}`;
    await insertInvite(admin, companyId, d.role, code);
    const email = emailFor(d.who);
    const userId = await createConfirmedUser(admin, email, password, {
      full_name:
        d.who === "hr"
          ? "HR E2E"
          : d.who === "manager"
            ? "Manager E2E"
            : `Emp ${d.who.slice(3)} E2E`,
      invite_code: code,
    });
    users[d.who] = { email, userId };
  }

  // 3. Map profiles.
  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id, user_id, full_name")
    .eq("company_id", companyId);
  if (pErr || !profiles) throw new Error(`profiles read failed: ${pErr?.message}`);
  const profById = new Map(profiles.map((p) => [p.user_id as string, p]));
  const prof = (userId: string) => {
    const p = profById.get(userId);
    if (!p) throw new Error(`no profile for user ${userId}`);
    return p.id as string;
  };

  const adminProfileId = prof(adminUserId);
  const managerProfileId = prof(users.manager.userId);

  // 4. Reporting lines: emp1 & emp2 → manager; emp3 → admin (so NOT a report of manager).
  const setMgr = async (empUserId: string, mgrProfileId: string) => {
    const { error } = await admin.from("profiles").update({ manager_id: mgrProfileId }).eq("user_id", empUserId);
    if (error) throw new Error(`set manager failed: ${error.message}`);
  };
  await setMgr(users.emp1.userId, managerProfileId);
  await setMgr(users.emp2.userId, managerProfileId);
  await setMgr(users.emp3.userId, adminProfileId);

  const mk = (who: string, role: string): SeededUser => ({
    email: users[who].email,
    userId: users[who].userId,
    profileId: prof(users[who].userId),
    role,
  });

  const seed: Seed = {
    runId,
    companyId,
    companyName,
    password,
    admin: { email: adminEmail, userId: adminUserId, profileId: adminProfileId, role: "admin" },
    hr: mk("hr", "hr"),
    manager: mk("manager", "manager"),
    emp1: mk("emp1", "employee"),
    emp2: mk("emp2", "employee"),
    emp3: mk("emp3", "employee"),
  };

  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2));
  return seed;
}

export async function teardownSeed(): Promise<void> {
  if (!existsSync(SEED_FILE)) return;
  const seed = readSeed();
  const admin = adminClient();
  // Delete auth users (cascades profiles/roles/leave rows via ON DELETE CASCADE).
  for (const u of [seed.admin, seed.hr, seed.manager, seed.emp1, seed.emp2, seed.emp3]) {
    try {
      await admin.auth.admin.deleteUser(u.userId);
    } catch {
      /* best effort */
    }
  }
  // Remove the company row and anything company-scoped left behind.
  try {
    await admin.from("company_invites").delete().eq("company_id", seed.companyId);
    await admin.from("companies").delete().eq("id", seed.companyId);
  } catch {
    /* best effort */
  }
  rmSync(SEED_FILE, { force: true });
}

// Delete all leave requests for the seeded company's users — keeps each leave test isolated.
export async function clearLeaveRequests(): Promise<void> {
  const seed = readSeed();
  const admin = adminClient();
  const ids = [seed.emp1.userId, seed.emp2.userId, seed.emp3.userId];
  await admin.from("leave_requests").delete().in("user_id", ids);
}
