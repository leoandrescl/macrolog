import { chromium } from "playwright-core";

const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "es-CL",
});
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
await page.getByText("Crea tu primer perfil").waitFor();
await page.getByLabel("Nombre del perfil").fill("PWA Test");
await page.getByRole("button", { name: "Crear mi perfil" }).click();
await page.waitForURL("**/diario");
await page.getByRole("button", { name: "Registrar alimento" }).waitFor();

const pwa = await page.evaluate(async () => {
  await navigator.serviceWorker.ready;
  return {
    controller: Boolean(navigator.serviceWorker.controller),
    registrations: (await navigator.serviceWorker.getRegistrations()).length,
    manifest: document.querySelector('link[rel="manifest"]')?.getAttribute("href"),
  };
});

await context.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" });
await page
  .getByRole("button", { name: "Registrar alimento" })
  .waitFor({ timeout: 12000 });
const offlineDiary = await page.evaluate(() => ({
  title: document.title,
  url: location.href,
  manifestLink: document.querySelector('link[rel="manifest"]')?.getAttribute("href"),
  controlled: Boolean(navigator.serviceWorker.controller),
  hasProfileName: document.body.textContent?.includes("PWA Test"),
}));

const bottomNav = page.locator('nav[aria-label="Navegación principal"]').last();
await bottomNav.getByRole("link", { name: "Alimentos" }).click();
await page.getByText("Tu biblioteca está vacía").waitFor({ timeout: 10000 });
const offlineFoods = await page.evaluate(() => ({
  title: document.title,
  url: location.href,
}));

await bottomNav.getByRole("link", { name: "Diario" }).click();
await page
  .getByRole("button", { name: "Registrar alimento" })
  .waitFor({ timeout: 10000 });

await context.setOffline(false);
await browser.close();

const result = { pwa, offlineDiary, offlineFoods, errors };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
