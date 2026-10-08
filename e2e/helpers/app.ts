import { expect, type Page } from "@playwright/test";
import { readSeed, type SeededUser } from "./seed";

// Log in through the real UI. Each test gets a fresh context, so no logout is needed.
export async function login(page: Page, who: SeededUser): Promise<void> {
  const seed = readSeed();
  await page.goto("/login");
  await page.locator("#email").fill(who.email);
  await page.locator("#password").fill(seed.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  // Land somewhere inside the app (dashboard). Wait for the login card to go away.
  await expect(page.getByRole("button", { name: "Sign In" })).toHaveCount(0, { timeout: 15000 });
}
