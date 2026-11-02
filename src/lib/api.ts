import type { DiaryEntry, Food, MealBlock, MetaRow, Profile } from "@/types/domain";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface CloudSnapshot {
  activeProfileId: string | null;
  data: {
    profiles: Profile[];
    meals: MealBlock[];
    entries: DiaryEntry[];
    meta: MetaRow[];
    /** Solo aparece en snapshots antiguos; hoy los alimentos son globales. */
    foods?: Food[];
  };
}

export interface CloudDataResponse {
  snapshot: CloudSnapshot | null;
  revision: number;
  updatedAt: number;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  familyCode: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = "api_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class NetworkError extends Error {
  constructor() {
    super("No se pudo conectar con el servidor.");
  }
}

const REQUEST_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(
  path: string,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(path, {
      ...init,
      credentials: "same-origin",
      signal: controller.signal,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new NetworkError();
    }
    throw new NetworkError();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const response = await fetchWithTimeout(path, init, timeoutMs);
  const body = await readJson(response);

  if (!response.ok) {
    const record =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    throw new ApiError(
      typeof record.error === "string"
        ? record.error
        : "No se pudo completar la solicitud.",
      response.status,
      typeof record.code === "string" ? record.code : "api_error",
    );
  }

  return body as T;
}

export async function fetchSession(): Promise<AuthUser | null> {
  const response = await fetchWithTimeout("/api/auth/session", {}, 8_000);
  if (response.status === 401) return null;

  const body = await readJson(response);
  if (!response.ok) {
    const record =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    throw new ApiError(
      typeof record.error === "string" ? record.error : "No se pudo verificar la sesión.",
      response.status,
      typeof record.code === "string" ? record.code : "api_error",
    );
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return (record.user as AuthUser | undefined) ?? null;
}

export async function loginRequest(email: string, password: string): Promise<AuthUser> {
  const body = await request<{ user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return body.user;
}

export async function registerRequest(input: RegisterInput): Promise<AuthUser> {
  const body = await request<{ user: AuthUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return body.user;
}

export async function logoutRequest(): Promise<void> {
  await request<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export async function changePasswordRequest(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await request<{ ok: true }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function fetchCloudData(): Promise<CloudDataResponse> {
  return request<CloudDataResponse>("/api/data");
}

export async function putCloudData(
  snapshot: CloudSnapshot,
  baseRevision: number,
): Promise<{ revision: number; updatedAt: number }> {
  return request<{ revision: number; updatedAt: number }>(
    "/api/data",
    {
      method: "PUT",
      body: JSON.stringify({ snapshot, baseRevision }),
    },
    30_000,
  );
}

export async function deleteCloudData(): Promise<void> {
  await request<{ ok: true }>("/api/data", { method: "DELETE" });
}

export interface GlobalFoodsResponse {
  foods: Food[];
  updatedAt: number;
}

export async function fetchGlobalFoods(): Promise<GlobalFoodsResponse> {
  return request<GlobalFoodsResponse>("/api/foods", {}, 30_000);
}

export async function pushGlobalFoods(
  foods: Food[],
): Promise<{ updated: number; updatedAt: number }> {
  return request<{ updated: number; updatedAt: number }>(
    "/api/foods",
    {
      method: "PUT",
      body: JSON.stringify({ foods }),
    },
    45_000,
  );
}
