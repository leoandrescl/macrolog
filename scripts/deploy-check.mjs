import { chromium } from "playwright-core";

const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const base = process.env.MACROLOG_URL ?? "https://macrolog.leoandrescl.workers.dev";
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayKey = `${yesterday.getFullYear()}-${String(
  yesterday.getMonth() + 1,
).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "es-CL",
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

const response = await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
await page.getByText("Crea tu primer perfil").waitFor();

const headers = response?.headers() ?? {};
const security = {
  status: response?.status(),
  csp: headers["content-security-policy"],
  contentTypeOptions: headers["x-content-type-options"],
  frameOptions: headers["x-frame-options"],
};

await page.getByLabel("Nombre del perfil").fill("Deploy Test");
await page.getByRole("button", { name: /Alta proteína/ }).click();
await page.waitForFunction(() => {
  const protein = document.querySelector('input[name="protein"]')?.value;
  const carbs = document.querySelector('input[name="carbs"]')?.value;
  const fat = document.querySelector('input[name="fat"]')?.value;
  return protein === "150" && carbs === "225" && fat === "56";
});
await page.getByRole("button", { name: "Crear mi perfil" }).click();
await page.waitForURL("**/diario");
await page.getByRole("button", { name: "Registrar alimento" }).waitFor();

const nav = page.locator('nav[aria-label="Navegación principal"]').last();
await nav.getByRole("link", { name: "Perfiles" }).click();
await page.getByText(/Distribución automática/).waitFor();
const macroSplit = await page.evaluate(() => {
  const text = document.body.textContent ?? "";
  return {
    hasPresetLabel:
      text.includes("P 30%") && text.includes("C 45%") && text.includes("G 25%"),
    hasAutoGrams: text.includes("150") && text.includes("225") && text.includes("56"),
  };
});
await nav.getByRole("link", { name: "Alimentos" }).click();
await page.getByRole("button", { name: "Crear primer alimento" }).click();
await page.getByLabel("Nombre del alimento").fill("Arroz blanco");
await page.getByLabel("Calorías").fill("130");
await page.getByLabel("Proteína").fill("2,7");
await page.getByLabel("Carbohidratos").fill("28");
await page.getByLabel("Grasa").fill("0,3");
await page.getByRole("button", { name: "Crear alimento" }).click();
await page.waitForFunction(() => !document.querySelector("dialog[open]"));
await page.getByText("Arroz blanco").first().waitFor();

await nav.getByRole("link", { name: "Diario" }).click();
await page.getByRole("button", { name: "Registrar alimento" }).click();
await page
  .getByRole("dialog")
  .getByRole("button", { name: /Arroz blanco/ })
  .click();
await page.getByLabel("Cantidad consumida (en crudo)").fill("150");
await page.getByRole("button", { name: /Agregar 150 g/ }).click();
await page.waitForFunction(() => !document.querySelector("dialog[open]"));
await page.getByText("150 g").first().waitFor();

const diaryState = await page.evaluate(() => ({
  hasEntry: document.body.textContent?.includes("Arroz blanco"),
  remaining: document.body.textContent?.includes("1.805"),
}));

await nav.getByRole("link", { name: "Ajustes" }).click();
await page.getByRole("button", { name: "Exportar respaldo" }).waitFor();
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Exportar respaldo" }).click();
const download = await downloadPromise;
const downloadPath = await download.path();
const downloadName = download.suggestedFilename();

const pwa = await page.evaluate(async () => {
  await navigator.serviceWorker.ready;
  return {
    controller: Boolean(navigator.serviceWorker.controller),
    manifest: document.querySelector('link[rel="manifest"]')?.getAttribute("href"),
  };
});

await page.goto(`${base}/diario/${yesterdayKey}`, { waitUntil: "domcontentloaded" });
await page.getByText("Ayer").first().waitFor({ timeout: 10000 });
const deepLink = await page.evaluate(() => ({
  title: document.title,
  url: location.href,
}));

await context.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" });
await page.getByText("Ayer").first().waitFor({ timeout: 12000 });
const offline = await page.evaluate(() => ({
  title: document.title,
  url: location.href,
  controlled: Boolean(navigator.serviceWorker.controller),
}));
await context.setOffline(false);

await browser.close();

const result = {
  security,
  macroSplit,
  diaryState,
  download: { name: downloadName, saved: Boolean(downloadPath) },
  pwa,
  deepLink,
  offline,
  errors,
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
