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
  // Refusing to reuse a running server makes a busy port an error, rather than
  // silently testing whatever else answers there.
  webServer: {
    command: "npx vite --port 8000 --strictPort",
    url: "http://localhost:8000",
    reuseExistingServer: false,
  },
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
