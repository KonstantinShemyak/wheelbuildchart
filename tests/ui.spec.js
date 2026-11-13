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
  await expect(page.locator("#spokeThickness")).not.toHaveValue("");
  await expect(page.locator("#spokeThicknessNDS")).not.toHaveValue("");
  await expect(page).toHaveScreenshot("tensometer-switch-1.png", {
    threshold: 0.2,
  });
});

test("switching tensometer keeps the same spoke under its new name", async ({
  page,
}) => {
  await page.goto("http://localhost:8000");
  // ParkTool calls the straight 2.0 mm spoke "2"
  await expect(page.locator("#spokeThickness")).toHaveValue("2");
  await page.selectOption("#usedTensometer", "DT Tensio");
  await expect(page.locator("#spokeThickness")).toHaveValue(
    "2.0 (DT Champion)",
  );
  await expect(page.locator("#spokeThicknessNDS")).toHaveValue(
    "2.0 (DT Champion)",
  );
  await page.selectOption("#usedTensometer", "ZTTO TC-02");
  await expect(page.locator("#spokeThickness")).toHaveValue("2.0");
  await expect(page.locator("#spokeThicknessNDS")).toHaveValue("2.0");
});

test("switching tensometer to one without the spoke selects its first spoke", async ({
  page,
}) => {
  await page.goto("http://localhost:8000");
  await page.selectOption("#spokeThickness", "1.5");
  // Unior lists no straight 1.5 mm spoke; "1.8 - 1.4 - 1.8" comes first in
  // its list
  await page.selectOption("#usedTensometer", "Unior");
  await expect(page.locator("#spokeThickness")).toHaveValue("1.8 - 1.4 - 1.8");
  // The other side's spoke is listed, so it stays
  await expect(page.locator("#spokeThicknessNDS")).toHaveValue(
    "2.0 - 2.0 - 2.0",
  );
});

test("the thickness list offers estimated spokes below a separator", async ({
  page,
}) => {
  await page.goto("http://localhost:8000");
  const options = page.locator("#spokeThickness option");
  const labels = await options.allTextContents();
  // ParkTool's own spokes come first, in their usual order
  expect(labels.slice(0, 5)).toEqual(["1.5", "1.6", "1.8", "2", "2.3"]);
  const separator = options.nth(5);
  await expect(separator).toHaveText("--- estimated ---");
  // Not selectable (toBeDisabled() does not apply to an <option>)
  await expect(separator).toHaveAttribute("disabled");
  // ParkTool lists no 1.7 mm spoke, but can estimate one
  expect(labels.slice(6)).toContain("1.7");
});

test("an estimated spoke's tension lies between its neighbours'", async ({
  page,
}) => {
  await page.goto("http://localhost:8000");
  await page.selectOption("#spokeThickness", "1.7");
  // ParkTool's chart: reading 20 means 128 kgf on a 1.6, 94 kgf on a 1.8
  await expect(page.locator("#reading1")).toHaveValue("20");
  const tension = Number(
    await page.locator("#tension1 .tension-value").textContent(),
  );
  expect(tension).toBeGreaterThan(94);
  expect(tension).toBeLessThan(128);
});

test("switching tensometer keeps a spoke it can only estimate", async ({
  page,
}) => {
  await page.goto("http://localhost:8000");
  await page.selectOption("#usedTensometer", "Toopre TL-P03");
  await page.selectOption("#spokeThickness", "1.7");
  // ZTTO lists no 1.7 mm spoke, but can estimate it
  await page.selectOption("#usedTensometer", "ZTTO TC-02");
  await expect(page.locator("#spokeThickness")).toHaveValue("1.7");
});

test("switching tensometer before entering readings asks nothing", async ({
  page,
}) => {
  await page.goto("http://localhost:8000");
  await page.selectOption("#usedTensometer", "DT Tensio");
  await expect(page.locator("#reading1")).toHaveValue("1.89");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test.describe("switching tensometer after entering a reading", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8000");
    const reading1 = page.locator("#reading1");
    await reading1.fill("22");
    await reading1.press("Tab");
    await page.selectOption("#usedTensometer", "DT Tensio");
  });

  test("asks whether to keep the readings", async ({ page }) => {
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("DT Tensio");
    await expect(page).toHaveScreenshot("readings-dialog-1.png", {
      threshold: 0.2,
    });
  });

  test("keeps them on request", async ({ page }) => {
    await page.getByRole("button", { name: "Keep my readings" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.locator("#reading1")).toHaveValue("22");
    await expect(page.locator("#reading3")).toHaveValue("20");
    await expect(page.locator("#usedTensometer")).toHaveValue("DT Tensio");
  });

  test("replaces them on request", async ({ page }) => {
    await page.getByRole("button", { name: "Use typical readings" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.locator("#reading1")).toHaveValue("1.89");
    await expect(page.locator("#reading2")).toHaveValue("1.73");
  });

  test("keeps them when dismissed", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.locator("#reading1")).toHaveValue("22");
  });
});

test("a 2:1 laced wheel shows twice as many drive side spokes", async ({
  page,
}) => {
  await page.goto("http://localhost:8000");
  await page.selectOption("#nSpokes", "16:8");
  await expect(page).toHaveScreenshot("two-to-one-1.png", {
    fullPage: true,
    threshold: 0.2,
  });
});

test("chart stays pinned while the table scrolls", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "the chart is only pinned on narrow screens");
  await page.goto("http://localhost:8000");
  // Bootstrap smooths scrolling by default; jump so the screenshot is stable.
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
  await expect(page).toHaveScreenshot("chart-pinned-1.png", {
    threshold: 0.2,
  });
});
