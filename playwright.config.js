import { defineConfig, devices } from "@playwright/test";

// Both projects must render fonts identically, or their snapshots disagree.
const launchOptions = {
  args: [
    "--disable-gpu",
    "--disable-font-subpixel-positioning",
    "--disable-software-compositing",
    "--font-render-hinting=none",
    "--force-color-profile=srgb",
  ],
};

export default defineConfig({
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", launchOptions },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"], launchOptions },
    },
  ],
});
