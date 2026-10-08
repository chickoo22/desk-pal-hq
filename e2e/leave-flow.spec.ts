import { test, expect, type Browser, type Page } from "@playwright/test";
import { readSeed, clearLeaveRequests, type SeededUser } from "./helpers/seed";
import { login } from "./helpers/app";
import { applyLeaveAsUser, getLeaveRow, getBalanceRemaining, latestNotification } from "./helpers/leave";
import { adminClient } from "./helpers/admin";

// Fresh browser context per role so each person's session (localStorage) is isolated.
async function openAs(browser: Browser, who: SeededUser): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, who);
  return page;
}

// Click Approve/Reject in the Approvals table row for a given employee name.
async function decideInRow(page: Page, employeeName: string, action: "Approve" | "Reject") {
  const row = page.getByRole("row", { name: new RegExp(employeeName) });
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.getByRole("button", { name: action }).click();
  await expect(page.getByText("Decision recorded")).toBeVisible({ timeout: 10000 });
}

test.describe("Leave application & two-stage approval (LV)", () => {
  test.beforeEach(async () => {
    await clearLeaveRequests();
  });

  test("LV-01: employee applies for leave through the UI", async ({ browser }) => {
    const seed = readSeed();
    const page = await openAs(browser, seed.emp1);
    await page.goto("/leave");
    await page.getByRole("button", { name: "Apply Leave" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Leave Type (first combobox in the dialog).
    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /Casual/ }).first().click();

    const start = new Date();
    start.setDate(start.getDate() + 10);
    const end = new Date();
    end.setDate(end.getDate() + 11);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const dates = dialog.locator('input[type="date"]');
    await dates.nth(0).fill(iso(start));
    await dates.nth(1).fill(iso(end));
    await dialog.getByRole("textbox").fill("E2E UI apply");

    await dialog.getByRole("button", { name: "Submit Request" }).click();
    await expect(page.getByText("Leave request submitted!")).toBeVisible({ timeout: 10000 });
    // Shows up as pending in My Requests.
    await expect(page.getByText("pending").first()).toBeVisible();
  });

  test("LV-02/03: manager approves, then HR approves -> fully approved", async ({ browser }) => {
    const seed = readSeed();
    const beforeBal = await getBalanceRemaining(seed.emp1.userId);
    const reqId = await applyLeaveAsUser(seed.emp1, { days: 2 });

    // Stage 1 — manager approves.
    const mgr = await openAs(browser, seed.manager);
    await mgr.goto("/approvals");
    await decideInRow(mgr, "Emp 1 E2E", "Approve");
    await mgr.context().close();

    let row = await getLeaveRow(reqId);
    expect(row.manager_status).toBe("approved");
    expect(row.status).toBe("pending"); // not final yet

    // Stage 2 — HR approves.
    const hr = await openAs(browser, seed.hr);
    await hr.goto("/approvals");
    await decideInRow(hr, "Emp 1 E2E", "Approve");
    await hr.context().close();

    row = await getLeaveRow(reqId);
    expect(row.hr_status).toBe("approved");
    expect(row.status).toBe("approved");

    // Balance dropped by 2 and employee was notified.
    expect(await getBalanceRemaining(seed.emp1.userId)).toBe(beforeBal - 2);
    expect((await latestNotification(seed.emp1.userId)).toLowerCase()).toContain("approved");

    // Employee sees it approved in their own list.
    const emp = await openAs(browser, seed.emp1);
    await emp.goto("/leave");
    await expect(emp.getByText("approved").first()).toBeVisible();
    await emp.context().close();
  });

  test("LV-04: manager rejects -> flow ends, days returned", async ({ browser }) => {
    const seed = readSeed();
    const beforeBal = await getBalanceRemaining(seed.emp1.userId);
    const reqId = await applyLeaveAsUser(seed.emp1, { days: 2 });

    const mgr = await openAs(browser, seed.manager);
    await mgr.goto("/approvals");
    await decideInRow(mgr, "Emp 1 E2E", "Reject");
    await mgr.context().close();

    const row = await getLeaveRow(reqId);
    expect(row.manager_status).toBe("rejected");
    expect(row.status).toBe("rejected");
    expect(row.hr_status).toBe("pending"); // never reached HR
    // Pending days returned to balance.
    expect(await getBalanceRemaining(seed.emp1.userId)).toBe(beforeBal);
    expect((await latestNotification(seed.emp1.userId)).toLowerCase()).toContain("rejected");
  });

  test("LV-05: HR rejects after manager approval", async ({ browser }) => {
    const seed = readSeed();
    const reqId = await applyLeaveAsUser(seed.emp1, { days: 2 });
    // Pre-approve at manager stage directly (that step is covered by LV-02).
    await adminClient()
      .from("leave_requests")
      .update({ manager_status: "approved", manager_reviewed_by: seed.manager.userId })
      .eq("id", reqId);

    const hr = await openAs(browser, seed.hr);
    await hr.goto("/approvals");
    await decideInRow(hr, "Emp 1 E2E", "Reject");
    await hr.context().close();

    const row = await getLeaveRow(reqId);
    expect(row.hr_status).toBe("rejected");
    expect(row.status).toBe("rejected");
    expect((await latestNotification(seed.emp1.userId)).toLowerCase()).toContain("hr");
  });

  test("LV-11: manager sees only direct reports in the approval queue", async ({ browser }) => {
    const seed = readSeed();
    await applyLeaveAsUser(seed.emp1, { days: 1, startOffset: 7 }); // reports to manager
    await applyLeaveAsUser(seed.emp3, { days: 1, startOffset: 7 }); // does NOT report to manager

    const mgr = await openAs(browser, seed.manager);
    await mgr.goto("/approvals");
    // emp1 appears in Stage 1; emp3 never does.
    await expect(mgr.getByRole("row", { name: /Emp 1 E2E/ })).toBeVisible({ timeout: 15000 });
    await expect(mgr.getByRole("row", { name: /Emp 3 E2E/ })).toHaveCount(0);
    await mgr.context().close();
  });
});
