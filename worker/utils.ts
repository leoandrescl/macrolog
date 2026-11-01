import type { Env } from "./types";

export const SESSION_COOKIE = "macrolog_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 180;
// Cloudflare Workers limita PBKDF2 a 100.000 iteraciones.
export const PBKDF2_ITERATIONS = 100_000;
export const AUTH_BODY_LIMIT = 16_384;
export const DATA_BODY_LIMIT = 8_000_000;
export const DATA_BLOB_LIMIT = 1_900_000;
const encoder = new TextEncoder();

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "bad_request") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export function json(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function errorJson(error: HttpError): Response {
  return json({ error: error.message, code: error.code }, error.status);
}

export function assertValidOrigin(request: Request): void {
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) return;

  const origin = request.headers.get("Origin");
  if (!origin) return;

  const expected = new URL(request.url).origin;
  if (origin === expected) return;

  const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  if (localOrigin.test(origin) && localOrigin.test(expected)) return;

  throw new HttpError("Origen no permitido.", 403, "forbidden");
}

export function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === SESSION_COOKIE) {
      return rest.join("=") || null;
    }
  }

  return null;
}

export function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}

export function sessionCookie(
  token: string,
  secure: boolean,
  maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000),
): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function getClientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "local";
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpError("La solicitud es demasiado grande.", 413, "payload_too_large");
  }

  const text = await request.text();
  if (encoder.encode(text).byteLength > maxBytes) {
    throw new HttpError("La solicitud es demasiado grande.", 413, "payload_too_large");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError("El cuerpo de la solicitud no es JSON válido.", 400);
  }
}

export function requireRecord(
  value: unknown,
  message = "Datos inválidos.",
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(message, 400);
  }
  return value as Record<string, unknown>;
}

export function requireString(
  value: unknown,
  field: string,
  min: number,
  max: number,
): string {
  if (typeof value !== "string") {
    throw new HttpError(`${field} es obligatorio.`, 400);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpError(`${field} no tiene una longitud válida.`, 400);
  }
  return trimmed;
}

export function normalizeEmail(value: unknown): string {
  const email = requireString(value, "El correo", 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError("Ingresa un correo válido.", 400);
  }
  return email;
}

export function requirePassword(value: unknown, field = "La contraseña"): string {
  if (typeof value !== "string") {
    throw new HttpError(`${field} es obligatoria.`, 400);
  }
  if (value.length < 8 || value.length > 128) {
    throw new HttpError(`${field} debe tener entre 8 y 128 caracteres.`, 400);
  }
  return value;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function derivePassword(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<{
  hash: string;
  salt: string;
  iterations: number;
}> {
  const salt = randomBytes(16);
  const hash = await derivePassword(password, salt, PBKDF2_ITERATIONS);
  return {
    hash: bytesToBase64(hash),
    salt: bytesToBase64(salt),
    iterations: PBKDF2_ITERATIONS,
  };
}

export async function verifyPassword(
  password: string,
  salt: string,
  hash: string,
  iterations: number,
): Promise<boolean> {
  const derived = await derivePassword(password, base64ToBytes(salt), iterations);
  return timingSafeEqual(bytesToBase64(derived), hash);
}

const DUMMY_SALT = "AAAAAAAAAAAAAAAAAAAAAA==";
const DUMMY_HASH = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export async function verifyPasswordOrDummy(
  password: string,
  salt: string | null,
  hash: string | null,
  iterations: number | null,
): Promise<boolean> {
  if (!salt || !hash || !iterations) {
    await verifyPassword(password, DUMMY_SALT, DUMMY_HASH, PBKDF2_ITERATIONS);
    return false;
  }
  return verifyPassword(password, salt, hash, iterations);
}

export async function gzipString(value: string): Promise<Uint8Array> {
  const stream = new Response(value).body?.pipeThrough(new CompressionStream("gzip"));
  if (!stream) throw new Error("No se pudo comprimir el respaldo.");
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function gunzipString(value: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  const stream = new Response(bytes).body?.pipeThrough(new DecompressionStream("gzip"));
  if (!stream) throw new Error("No se pudo descomprimir el respaldo.");
  return await new Response(stream).text();
}

export async function hitRateLimit(
  env: Env,
  key: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const now = Date.now();
  const row = await env.DB.prepare(
    "SELECT attempts, expires_at FROM auth_attempts WHERE key = ?",
  )
    .bind(key)
    .first<{ attempts: number; expires_at: number }>();

  if (!row || row.expires_at <= now) {
    await env.DB.prepare(
      "INSERT INTO auth_attempts (key, attempts, expires_at) VALUES (?, 1, ?) " +
        "ON CONFLICT(key) DO UPDATE SET attempts = 1, expires_at = excluded.expires_at",
    )
      .bind(key, now + windowMs)
      .run();
    return;
  }

  if (row.attempts >= limit) {
    throw new HttpError(
      "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
      429,
      "rate_limited",
    );
  }

  await env.DB.prepare(
    "UPDATE auth_attempts SET attempts = attempts + 1 WHERE key = ? AND expires_at > ?",
  )
    .bind(key, now)
    .run();
}
