import { defineConfig, devices } from "@playwright/test";

// Yerelde sistemdeki Chrome kullanılır (PW_CHANNEL=chrome); CI'da Playwright'ın kendi Chromium'u.
export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.e2e\.ts/,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    ...devices["Pixel 7"],
    channel: process.env.PW_CHANNEL || undefined,
    baseURL: "http://127.0.0.1:54321",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    trace: "retain-on-failure",
  },
});
