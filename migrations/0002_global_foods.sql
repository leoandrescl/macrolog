PRAGMA foreign_keys = ON;

-- Biblioteca global: compartida por todas las cuentas y todos los perfiles.
CREATE TABLE IF NOT EXISTS foods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  kcal REAL NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fat REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_foods_name_normalized ON foods(name_normalized);
CREATE INDEX IF NOT EXISTS idx_foods_updated_at ON foods(updated_at);
