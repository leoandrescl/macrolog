import type { AuthUser, Env, StoredUser } from "./types";
import {
  bytesToBase64Url,
  getSessionToken,
  HttpError,
  randomBytes,
  SESSION_TTL_MS,
  sha256Hex,
} from "./utils";

export interface AuthSession {
  user: AuthUser;
  token: string;
  tokenHash: string;
  expiresAt: number;
}

export async function createSession(
  env: Env,
  userId: string,
): Promise<{ token: string; tokenHash: string; expiresAt: number }> {
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const token = bytesToBase64Url(randomBytes(32));
  const tokenHash = await sha256Hex(token);

  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?")
    .bind(userId, now)
    .run();

  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(tokenHash, userId, expiresAt, now)
    .run();

  return { token, tokenHash, expiresAt };
}

export async function getAuthSession(
  request: Request,
  env: Env,
): Promise<AuthSession | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    "SELECT u.id, u.name, u.email, s.expires_at " +
      "FROM sessions s JOIN users u ON u.id = s.user_id " +
      "WHERE s.token_hash = ? AND s.expires_at > ?",
  )
    .bind(tokenHash, Date.now())
    .first<{ id: string; name: string; email: string; expires_at: number }>();

  if (!row) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ? AND expires_at <= ?")
      .bind(tokenHash, Date.now())
      .run();
    return null;
  }

  return {
    user: { id: row.id, name: row.name, email: row.email },
    token,
    tokenHash,
    expiresAt: row.expires_at,
  };
}

export async function requireSession(request: Request, env: Env): Promise<AuthSession> {
  const session = await getAuthSession(request, env);
  if (!session) {
    throw new HttpError("Necesitas iniciar sesión.", 401, "unauthorized");
  }
  return session;
}

export async function refreshSession(env: Env, session: AuthSession): Promise<number> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ?")
    .bind(expiresAt, session.tokenHash)
    .run();
  return expiresAt;
}

export async function deleteSession(env: Env, tokenHash: string): Promise<void> {
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}

export async function getUserWithPassword(
  env: Env,
  userId: string,
): Promise<StoredUser | null> {
  return env.DB.prepare(
    "SELECT id, name, email, password_hash, password_salt, password_iterations " +
      "FROM users WHERE id = ?",
  )
    .bind(userId)
    .first<StoredUser>();
}
