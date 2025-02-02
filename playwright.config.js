import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: {
    browserName: "chromium",
    launchOptions: {
      args: [
        "--disable-gpu",
        "--disable-font-subpixel-positioning",
        "--disable-software-compositing",
        "--font-render-hinting=none",
        "--force-color-profile=srgb",
      ],
    },
  },
});
