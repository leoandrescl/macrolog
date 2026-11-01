import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    local: { type: "boolean", default: false },
  },
});

const email = values.email?.trim().toLowerCase();
const password = values.password;

if (!email?.includes("@")) {
  console.error(
    "Uso: node scripts/reset-password.mjs --email <correo> --password <nueva> [--local]",
  );
  process.exit(1);
}

if (!password || password.length < 8 || password.length > 128) {
  console.error("La contraseña debe tener entre 8 y 128 caracteres.");
  process.exit(1);
}

const iterations = 100_000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(password),
  "PBKDF2",
  false,
  ["deriveBits"],
);
const hash = new Uint8Array(
  await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  ),
);

const saltB64 = Buffer.from(salt).toString("base64");
const hashB64 = Buffer.from(hash).toString("base64");
const escapedEmail = email.replace(/'/g, "''");

const updateSql =
  `UPDATE users SET password_hash = '${hashB64}', password_salt = '${saltB64}', ` +
  `password_iterations = ${iterations} WHERE email = '${escapedEmail}'`;
const revokeSql = `DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = '${escapedEmail}')`;

const wranglerBin = fileURLToPath(
  new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);
const location = values.local ? "--local" : "--remote";

for (const command of [updateSql, revokeSql]) {
  execFileSync(
    process.execPath,
    [wranglerBin, "d1", "execute", "macrolog-db", location, "--command", command],
    { stdio: "inherit" },
  );
}

console.log(
  `\nContraseña actualizada para ${email}. Las sesiones abiertas fueron revocadas.`,
);
