import { chromium } from "playwright-core";

const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const base = process.env.MACROLOG_URL ?? "https://macrolog.leoandrescl.workers.dev";
const familyCode = process.env.MACROLOG_FAMILY_CODE;
const password = "MacroLog-Deploy-2026!";

if (!familyCode) {
  throw new Error("Define MACROLOG_FAMILY_CODE para ejecutar el smoke test.");
}

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

const response = await page.goto(`${base}/`, {
  waitUntil: "domcontentloaded",
  timeout: 30000,
});
await page.getByText("Entra a tu MacroLog").waitFor({ timeout: 15000 });

const security = {
  status: response?.status(),
  csp: response?.headers()["content-security-policy"],
  contentTypeOptions: response?.headers()["x-content-type-options"],
  frameOptions: response?.headers()["x-frame-options"],
};

const email = `deploy-${Date.now()}@example.com`;
await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
await page.getByLabel("Tu nombre").fill("Deploy Test");
await page.getByLabel("Correo", { exact: true }).fill(email);
await page.getByLabel("Contraseña", { exact: true }).fill(password);
await page.getByLabel("Repite la contraseña").fill(password);
await page.getByLabel("Código de familia").fill(familyCode);
await page
  .locator("form")
  .getByRole("button", { name: "Crear cuenta", exact: true })
  .click();
await page.getByText("Crea tu primer perfil").waitFor({ timeout: 20000 });

await page.getByLabel("Nombre del perfil").fill("Deploy Profile");
await page.getByRole("button", { name: /Alta proteína/ }).click();
await page.waitForFunction(() => {
  const protein = document.querySelector('input[name="protein"]')?.value;
  const carbs = document.querySelector('input[name="carbs"]')?.value;
  const fat = document.querySelector('input[name="fat"]')?.value;
  return protein === "150" && carbs === "225" && fat === "56";
});
await page.getByRole("button", { name: "Crear mi perfil" }).click();
await page.getByRole("button", { name: "Registrar alimento" }).waitFor({
  timeout: 15000,
});

const nav = page.locator('nav[aria-label="Navegación principal"]').last();
await nav.getByRole("link", { name: "Perfiles" }).click();
await page.getByRole("heading", { name: "Perfil activo" }).waitFor();
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

await page.waitForFunction(
  () => {
    const raw = localStorage.getItem("macrolog.sync");
    if (!raw) return false;
    const meta = JSON.parse(raw);
    return meta.dirty === false && meta.revision >= 1;
  },
  null,
  { timeout: 20000 },
);
const synced = await page.evaluate(() => localStorage.getItem("macrolog.sync"));

await page.reload({ waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Registrar alimento" }).waitFor({
  timeout: 15000,
});

await nav.getByRole("link", { name: "Ajustes" }).click();
await page.getByRole("button", { name: "Exportar respaldo" }).waitFor();
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Exportar respaldo" }).click();
const download = await downloadPromise;
const downloadPath = await download.path();

const pwa = await page.evaluate(async () => {
  await navigator.serviceWorker.ready;
  return {
    controller: Boolean(navigator.serviceWorker.controller),
    manifest: document.querySelector('link[rel="manifest"]')?.getAttribute("href"),
  };
});

await page.goto(`${base}/diario/${yesterdayKey}`, { waitUntil: "domcontentloaded" });
await page.getByText("Ayer").first().waitFor({ timeout: 12000 });

await context.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" });
await page.getByText("Ayer").first().waitFor({ timeout: 15000 });
const offline = await page.evaluate(() => ({
  title: document.title,
  url: location.href,
  controlled: Boolean(navigator.serviceWorker.controller),
}));
await context.setOffline(false);

await nav.getByRole("link", { name: "Ajustes" }).click();
await page.getByRole("button", { name: "Cerrar sesión" }).click();
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Cerrar sesión", exact: true })
  .click();
await page.getByText("Entra a tu MacroLog").waitFor({ timeout: 15000 });
await page.getByLabel("Correo", { exact: true }).fill(email);
await page.getByLabel("Contraseña", { exact: true }).fill(password);
await page.getByRole("button", { name: "Entrar", exact: true }).click();
await page.getByRole("button", { name: "Registrar alimento" }).waitFor({
  timeout: 15000,
});
await nav.getByRole("link", { name: "Perfiles" }).click();
await page.getByRole("heading", { name: "Deploy Profile" }).waitFor({
  timeout: 15000,
});

const account = await page.evaluate(() => {
  const user = localStorage.getItem("macrolog.auth.user");
  return user ? JSON.parse(user) : null;
});

await browser.close();

console.log(
  JSON.stringify(
    {
      security,
      account: account?.email,
      macroSplit,
      synced,
      download: { name: download.suggestedFilename(), saved: Boolean(downloadPath) },
      pwa,
      offline,
      errors,
    },
    null,
    2,
  ),
);
if (errors.length) process.exitCode = 1;
