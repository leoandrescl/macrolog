export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  FAMILY_SIGNUP_CODE?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface StoredUser extends AuthUser {
  password_hash: string;
  password_salt: string;
  password_iterations: number;
}
