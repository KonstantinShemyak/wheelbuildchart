import { test, expect } from "@playwright/test";

test("UI should remain unchanged", async ({ page }) => {
  await page.goto("http://127.0.0.1:8000");
  await expect(page).toHaveScreenshot("UI-should-remain-unchanged-1.png", {
    threshold: 0.2,
  });
});
