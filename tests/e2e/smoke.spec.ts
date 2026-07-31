import { test, expect } from "@playwright/test";

test.describe("fikraInAction public shell", () => {
  test("Arabic home responds", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("lang", /ar|en/);
    await expect(page.getByRole("link", { name: /fikraInAction|home/i }).first()).toBeVisible();
  });

  test("English home responds", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("body")).toContainText(/fikraInAction|idea|action|technology/i);
  });

  test("language switcher is present", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator(".language-switcher")).toBeVisible();
  });

  test("search page is noindex path", async ({ page }) => {
    await page.goto("/en/search");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("admin gate is reachable", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("body")).toContainText(/Sign in|Firebase|administrator|studio/i);
  });
});
