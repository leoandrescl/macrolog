import {
  createSession,
  deleteSession,
  getAuthSession,
  getUserWithPassword,
  refreshSession,
  requireSession,
} from "./auth";
import { loadSnapshot, removeSnapshot, saveSnapshot, validateSnapshot } from "./data";
import { listFoods, parseFoodsPayload, upsertFoods } from "./foods";
import type { AuthUser, Env } from "./types";
import {
  AUTH_BODY_LIMIT,
  assertValidOrigin,
  clearSessionCookie,
  DATA_BODY_LIMIT,
  errorJson,
  getClientIp,
  getSessionToken,
  HttpError,
  hashPassword,
  hitRateLimit,
  isSecureRequest,
  json,
  normalizeEmail,
  readJsonBody,
  requirePassword,
  requireRecord,
  requireString,
  sessionCookie,
  sha256Hex,
  timingSafeEqual,
  verifyPassword,
  verifyPasswordOrDummy,
} from "./utils";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      return await handleApi(request, env, url);
    } catch (error) {
      if (error instanceof HttpError) {
        return errorJson(error);
      }
      console.error("MacroLog API error", error);
      return json({ error: "Error interno del servidor.", code: "internal_error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/\/+$/g, "") || "/";
  const method = request.method;

  if (path === "/api/health" && method === "GET") {
    return json({ ok: true });
  }

  if (path === "/api/auth/register" && method === "POST") {
    return register(request, env);
  }

  if (path === "/api/auth/login" && method === "POST") {
    return login(request, env);
  }

  if (path === "/api/auth/logout" && method === "POST") {
    return logout(request, env);
  }

  if (path === "/api/auth/session" && method === "GET") {
    return session(request, env);
  }

  if (path === "/api/auth/change-password" && method === "POST") {
    return changePassword(request, env);
  }

  if (path === "/api/data" && method === "GET") {
    return getData(request, env);
  }

  if (path === "/api/data" && method === "PUT") {
    return putData(request, env);
  }

  if (path === "/api/data" && method === "DELETE") {
    return deleteData(request, env);
  }

  if (path === "/api/foods" && method === "GET") {
    return getFoods(request, env);
  }

  if (path === "/api/foods" && method === "PUT") {
    return putFoods(request, env);
  }

  if (
    [
      "/api/auth/register",
      "/api/auth/login",
      "/api/auth/logout",
      "/api/auth/session",
      "/api/auth/change-password",
      "/api/data",
      "/api/foods",
    ].includes(path)
  ) {
    return json({ error: "Método no permitido.", code: "method_not_allowed" }, 405);
  }

  return json({ error: "Ruta no encontrada.", code: "not_found" }, 404);
}

async function register(request: Request, env: Env): Promise<Response> {
  assertValidOrigin(request);
  const ip = getClientIp(request);
  await hitRateLimit(env, `register:${ip}`, 30, 60 * 60 * 1000);

  const body = requireRecord(await readJsonBody(request, AUTH_BODY_LIMIT));
  const name = requireString(body.name, "El nombre", 1, 40);
  const email = normalizeEmail(body.email);
  const password = requirePassword(body.password);
  const familyCode = requireString(body.familyCode, "El código de familia", 1, 100);

  const expectedCode = env.FAMILY_SIGNUP_CODE?.trim().toUpperCase();
  if (!expectedCode) {
    throw new HttpError(
      "El registro familiar no está configurado. Contacta al administrador.",
      503,
      "signup_disabled",
    );
  }

  if (!timingSafeEqual(familyCode.trim().toUpperCase(), expectedCode)) {
    throw new HttpError("Código de familia incorrecto.", 403, "invalid_family_code");
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string }>();
  if (existing) {
    throw new HttpError("Ya existe una cuenta con ese correo.", 409, "email_taken");
  }

  const passwordHash = await hashPassword(password);
  const user: AuthUser = {
    id: crypto.randomUUID(),
    name,
    email,
  };
  const now = Date.now();

  try {
    await env.DB.prepare(
      "INSERT INTO users (id, name, email, password_hash, password_salt, password_iterations, created_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        user.id,
        user.name,
        user.email,
        passwordHash.hash,
        passwordHash.salt,
        passwordHash.iterations,
        now,
      )
      .run();
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      throw new HttpError("Ya existe una cuenta con ese correo.", 409, "email_taken");
    }
    throw error;
  }

  const session = await createSession(env, user.id);

  return json({ user }, 201, {
    "Set-Cookie": sessionCookie(session.token, isSecureRequest(request)),
  });
}

async function login(request: Request, env: Env): Promise<Response> {
  assertValidOrigin(request);
  const body = requireRecord(await readJsonBody(request, AUTH_BODY_LIMIT));
  const email = normalizeEmail(body.email);
  const password = requirePassword(body.password);
  const ip = getClientIp(request);

  await hitRateLimit(env, `login-ip:${ip}`, 40, 15 * 60 * 1000);
  await hitRateLimit(env, `login-email:${email}`, 20, 15 * 60 * 1000);

  const user = await env.DB.prepare(
    "SELECT id, name, email, password_hash, password_salt, password_iterations " +
      "FROM users WHERE email = ?",
  )
    .bind(email)
    .first<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      password_salt: string;
      password_iterations: number;
    }>();

  const valid = await verifyPasswordOrDummy(
    password,
    user?.password_salt ?? null,
    user?.password_hash ?? null,
    user?.password_iterations ?? null,
  );

  if (!user || !valid) {
    throw new HttpError("Correo o contraseña incorrectos.", 401, "invalid_credentials");
  }

  const session = await createSession(env, user.id);

  return json({ user: { id: user.id, name: user.name, email: user.email } }, 200, {
    "Set-Cookie": sessionCookie(session.token, isSecureRequest(request)),
  });
}

async function logout(request: Request, env: Env): Promise<Response> {
  assertValidOrigin(request);
  const token = getSessionToken(request);
  if (token) {
    await deleteSession(env, await sha256Hex(token));
  }

  return json({ ok: true }, 200, {
    "Set-Cookie": clearSessionCookie(isSecureRequest(request)),
  });
}

async function session(request: Request, env: Env): Promise<Response> {
  const auth = await getAuthSession(request, env);
  if (!auth) {
    return json({ user: null }, 200, {
      "Set-Cookie": clearSessionCookie(isSecureRequest(request)),
    });
  }

  await refreshSession(env, auth);

  return json({ user: auth.user }, 200, {
    "Set-Cookie": sessionCookie(auth.token, isSecureRequest(request)),
  });
}

async function changePassword(request: Request, env: Env): Promise<Response> {
  assertValidOrigin(request);
  const auth = await requireSession(request, env);
  const body = requireRecord(await readJsonBody(request, AUTH_BODY_LIMIT));
  const currentPassword = requirePassword(body.currentPassword, "La contraseña actual");
  const newPassword = requirePassword(body.newPassword, "La nueva contraseña");

  const user = await getUserWithPassword(env, auth.user.id);
  if (!user) {
    throw new HttpError("La cuenta no existe.", 404, "not_found");
  }

  const valid = await verifyPassword(
    currentPassword,
    user.password_salt,
    user.password_hash,
    user.password_iterations,
  );
  if (!valid) {
    throw new HttpError("La contraseña actual es incorrecta.", 400, "invalid_password");
  }

  const passwordHash = await hashPassword(newPassword);
  await env.DB.prepare(
    "UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ? WHERE id = ?",
  )
    .bind(passwordHash.hash, passwordHash.salt, passwordHash.iterations, auth.user.id)
    .run();

  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?")
    .bind(auth.user.id, auth.tokenHash)
    .run();

  return json({ ok: true });
}

async function getData(request: Request, env: Env): Promise<Response> {
  const auth = await requireSession(request, env);
  const result = await loadSnapshot(env, auth.user.id);
  return json(result);
}

async function putData(request: Request, env: Env): Promise<Response> {
  assertValidOrigin(request);
  const auth = await requireSession(request, env);
  const body = requireRecord(await readJsonBody(request, DATA_BODY_LIMIT));
  const baseRevision = body.baseRevision;

  if (
    typeof baseRevision !== "number" ||
    !Number.isInteger(baseRevision) ||
    baseRevision < 0
  ) {
    throw new HttpError("La revisión de sincronización no es válida.", 400);
  }

  const snapshot = validateSnapshot(body.snapshot);
  const result = await saveSnapshot(env, auth.user.id, snapshot, baseRevision);
  return json(result);
}

async function deleteData(request: Request, env: Env): Promise<Response> {
  assertValidOrigin(request);
  const auth = await requireSession(request, env);
  await removeSnapshot(env, auth.user.id);
  return json({ ok: true });
}

async function getFoods(request: Request, env: Env): Promise<Response> {
  await requireSession(request, env);
  const result = await listFoods(env);
  return json(result);
}

async function putFoods(request: Request, env: Env): Promise<Response> {
  assertValidOrigin(request);
  await requireSession(request, env);
  const body = await readJsonBody(request, DATA_BODY_LIMIT);
  const foods = parseFoodsPayload(body);
  const updated = await upsertFoods(env, foods);
  return json({ updated, updatedAt: Date.now() });
}
