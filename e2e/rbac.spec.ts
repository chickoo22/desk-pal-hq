import { test, expect, type Page } from "@playwright/test";
import { readSeed } from "./helpers/seed";
import { login } from "./helpers/app";

async function pathAfterVisit(page: Page, path: string): Promise<string> {
  await page.goto(path);
  // Client-side guards redirect via <Navigate>; poll until the URL settles.
  await expect
    .poll(async () => new URL(page.url()).pathname, { timeout: 8000 })
    .not.toBe("__never__");
  await page.waitForTimeout(400);
  return new URL(page.url()).pathname;
}

async function expectDenied(page: Page, path: string) {
  expect(await pathAfterVisit(page, path), `${path} should be denied (redirect to /)`).toBe("/");
}
async function expectAllowed(page: Page, path: string) {
  expect(await pathAfterVisit(page, path), `${path} should be allowed`).toBe(path);
}

// RBAC-01..05 from TEST_PLAN.md
test.describe("Role-based access control (RBAC)", () => {
  test("RBAC-01: employee is denied every privileged route", async ({ page }) => {
    const seed = readSeed();
    await login(page, seed.emp1);
    for (const p of ["/employees", "/approvals", "/team", "/leave-types", "/shifts", "/attendance-rules", "/departments", "/import", "/company", "/user-roles", "/reports", "/salary"]) {
      await expectDenied(page, p);
    }
    // ...but their own routes work.
    await expectAllowed(page, "/leave");
    await expectAllowed(page, "/attendance");
  });

  test("RBAC-02: manager gets team routes, not HR/admin routes", async ({ page }) => {
    const seed = readSeed();
    await login(page, seed.manager);
    await expectAllowed(page, "/employees");
    await expectAllowed(page, "/approvals");
    await expectAllowed(page, "/team");
    for (const p of ["/leave-types", "/shifts", "/attendance-rules", "/import", "/company", "/user-roles", "/reports", "/salary"]) {
      await expectDenied(page, p);
    }
  });

  test("RBAC-03: HR gets HR routes but not /user-roles", async ({ page }) => {
    const seed = readSeed();
    await login(page, seed.hr);
    for (const p of ["/employees", "/approvals", "/leave-types", "/shifts", "/attendance-rules", "/departments", "/import", "/company", "/reports", "/salary"]) {
      await expectAllowed(page, p);
    }
    await expectDenied(page, "/user-roles");
  });

  test("RBAC-04: admin gets /user-roles and /company", async ({ page }) => {
    const seed = readSeed();
    await login(page, seed.admin);
    await expectAllowed(page, "/user-roles");
    await expectAllowed(page, "/company");
  });

  test("RBAC: company users cannot reach the owner console", async ({ page }) => {
    const seed = readSeed();
    await login(page, seed.admin);
    // OwnerRoute sends non-platform-admins to /.
    expect(await pathAfterVisit(page, "/owner")).toBe("/");
  });
});
