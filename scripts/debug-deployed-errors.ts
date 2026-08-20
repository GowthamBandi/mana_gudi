import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("--- CAPTURING CONSOLE ERRORS & FAILED NETWORK REQUESTS FOR /events ---");

  page.on("console", (msg) => {
    console.log(`CONSOLE [${msg.type()}]: ${msg.text()}`);
  });

  page.on("requestfailed", (req) => {
    console.log(`FAILED REQUEST: ${req.url()} (${req.failure()?.errorText})`);
  });

  page.on("response", (res) => {
    if (res.status() >= 400) {
      console.log(`HTTP ${res.status()}: ${res.url()}`);
    }
  });

  await page.goto("https://temple-seva-platform.web.app/events", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(10000);

  await browser.close();
})();
