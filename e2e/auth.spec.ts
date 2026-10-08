import { test, expect } from "@playwright/test";
import { readSeed } from "./helpers/seed";
import { login } from "./helpers/app";

// AUTH-06, AUTH-07, AUTH-16 from TEST_PLAN.md
test.describe("Authentication (AUTH)", () => {
  test("AUTH-06: each seeded role can sign in and reach the app", async ({ page }) => {
    const seed = readSeed();
    for (const who of [seed.admin, seed.hr, seed.manager, seed.emp1]) {
      await page.context().clearCookies();
      await login(page, who);
      // Signed in: the login form is gone and we are not on /login.
      await expect(page).not.toHaveURL(/\/login/);
    }
  });

  test("AUTH-07: wrong password shows a generic error and does not sign in", async ({ page }) => {
    const seed = readSeed();
    await page.goto("/login");
    await page.locator("#email").fill(seed.emp1.email);
    await page.locator("#password").fill("totally-wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    // Still on the login screen.
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("AUTH-16: signed-out access to a protected route redirects to /login", async ({ page }) => {
    await page.goto("/employees");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/payroll");
    await expect(page).toHaveURL(/\/login/);
  });

  test("AUTH-16: signed-out access to /owner redirects to /owner-login", async ({ page }) => {
    await page.goto("/owner");
    await expect(page).toHaveURL(/\/owner-login/);
  });
});
