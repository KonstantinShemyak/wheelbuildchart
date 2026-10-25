import { test, expect } from "@playwright/test";

test("UI should remain unchanged", async ({ page }) => {
  await page.goto("http://localhost:8000");
  await expect(page).toHaveScreenshot("UI-should-remain-unchanged-1.png", {
    threshold: 0.2,
  });
});

test("changing one reading updates the chart", async ({ page }) => {
  await page.goto("http://localhost:8000");
  const reading1 = page.locator("#reading1");
  await reading1.fill("28");
  // Commit the value: `change` fires on blur, not on `fill`.
  await reading1.press("Tab");
  await expect(page).toHaveScreenshot("reading-change-1.png", {
    threshold: 0.2,
  });
});

test("switching tensometer updates the chart", async ({ page }) => {
  await page.goto("http://localhost:8000");
  await page.selectOption("#usedTensometer", "DT Tensio");
  await expect(page).toHaveScreenshot("tensometer-switch-1.png", {
    threshold: 0.2,
  });
});
