import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const artifacts = path.resolve(".artifacts");
await mkdir(artifacts, { recursive: true });

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

const base = "http://127.0.0.1:5173";
const shot = async (name, fullPage = true) => {
  await page.screenshot({ path: path.join(artifacts, `${name}.png`), fullPage });
  console.log(`saved ${name}.png`);
};
const waitClosed = async () => {
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
};

await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
await page.getByText("Crea tu primer perfil").waitFor();
await shot("01-onboarding-mobile");

await page.getByLabel("Nombre del perfil").fill("Ana");
await page.getByRole("button", { name: "Crear mi perfil" }).click();
await page.waitForURL("**/diario");
await page.getByRole("button", { name: "Registrar alimento" }).waitFor();
await shot("02-diario-vacio-mobile");

const bottomNav = page.locator('nav[aria-label="Navegación principal"]').last();
await bottomNav.getByRole("link", { name: "Alimentos" }).click();
await page.getByText("Tu biblioteca está vacía").waitFor();
await shot("03-alimentos-vacio-mobile");

await page.getByRole("button", { name: "Crear primer alimento" }).click();
await page.getByText("Nuevo alimento").first().waitFor();
await page.getByLabel("Nombre del alimento").fill("Pechuga de pollo");
await page.getByLabel("Calorías").fill("165");
await page.getByLabel("Proteína").fill("31");
await page.getByLabel("Carbohidratos").fill("0");
await page.getByLabel("Grasa").fill("3,6");
await shot("04-formulario-alimento-mobile");
await page.getByRole("button", { name: "Crear alimento" }).click();
await waitClosed();
await page.getByText("Pechuga de pollo").first().waitFor();
await shot("05-alimentos-con-datos-mobile");

await bottomNav.getByRole("link", { name: "Diario" }).click();
await page.getByRole("button", { name: "Registrar alimento" }).click();
await page.getByRole("dialog").waitFor();
await page.getByText("TODOS LOS ALIMENTOS").waitFor();
await shot("06-buscar-alimento-mobile");

await page
  .getByRole("dialog")
  .getByRole("button", { name: /Pechuga de pollo/ })
  .click();
await page.getByLabel("Cantidad consumida (en crudo)").fill("250");
await shot("07-porcion-gramos-mobile");
await page.getByRole("button", { name: /Agregar 250 g/ }).click();
await waitClosed();
await page.getByText("250 g").first().waitFor();
await shot("08-diario-con-registro-mobile");

await bottomNav.getByRole("link", { name: "Perfiles" }).click();
await page.getByText("Orden del diario").waitFor();
await shot("09-perfiles-mobile");

await page.getByRole("button", { name: "Agregar", exact: true }).click();
await page.getByLabel("Nombre del bloque").fill("Pre-entreno");
await page.getByRole("button", { name: "Agregar bloque" }).click();
await waitClosed();
await page.getByText("Pre-entreno").first().waitFor();
await shot("10-perfiles-bloque-nuevo-mobile");

await bottomNav.getByRole("link", { name: "Ajustes" }).click();
await page.getByText("Datos y respaldo").waitFor();
await shot("11-ajustes-mobile");

await page.getByRole("button", { name: /Claro/ }).click();
await page.waitForFunction(() => document.documentElement.classList.contains("light"));
await page.waitForTimeout(350);
await shot("12-ajustes-claro-mobile");

await page.getByRole("button", { name: /Oscuro/ }).click();
await page.waitForFunction(() => !document.documentElement.classList.contains("light"));
await page.waitForTimeout(350);
await bottomNav.getByRole("link", { name: "Diario" }).click();
await page.getByText("250 g").first().waitFor();
await page.setViewportSize({ width: 1440, height: 900 });
await page.getByText("250 g").first().waitFor();
await shot("13-diario-desktop");

await browser.close();

if (errors.length) {
  console.log("CONSOLE_ERRORS");
  for (const error of errors) console.log(error);
  process.exitCode = 1;
} else {
  console.log("NO_CONSOLE_ERRORS");
}
