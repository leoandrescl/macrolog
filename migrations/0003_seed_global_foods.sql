PRAGMA foreign_keys = ON;

-- Alimentos base compartidos por toda la familia.
-- La migración es idempotente: omite registros cuyo ID o nombre ya exista
-- para no duplicar alimentos creados manualmente.

INSERT INTO foods (id, name, name_normalized, kcal, protein, carbs, fat, created_at, updated_at, deleted_at)
SELECT 'seed-food-merluza-apanada', 'Merluza apanada', 'merluza apanada', 223, 12, 19, 10,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       NULL
WHERE NOT EXISTS (
  SELECT 1 FROM foods WHERE id = 'seed-food-merluza-apanada' OR name_normalized = 'merluza apanada'
);

INSERT INTO foods (id, name, name_normalized, kcal, protein, carbs, fat, created_at, updated_at, deleted_at)
SELECT 'seed-food-papas-duquesas-tottus', 'Papas prefritas duquesas congeladas Tottus',
       'papas prefritas duquesas congeladas tottus', 135, 2.2, 20.6, 4.9,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       NULL
WHERE NOT EXISTS (
  SELECT 1 FROM foods
  WHERE id = 'seed-food-papas-duquesas-tottus'
     OR name_normalized IN ('papas prefritas duquesas congeladas tottus', 'papas duquesas')
);

INSERT INTO foods (id, name, name_normalized, kcal, protein, carbs, fat, created_at, updated_at, deleted_at)
SELECT 'seed-food-pan-integral-castano', 'Pan de molde integral con prebióticos Castaño',
       'pan de molde integral con prebioticos castano', 255, 12.8, 42.6, 3,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       NULL
WHERE NOT EXISTS (
  SELECT 1 FROM foods
  WHERE id = 'seed-food-pan-integral-castano'
     OR name_normalized = 'pan de molde integral con prebioticos castano'
);

INSERT INTO foods (id, name, name_normalized, kcal, protein, carbs, fat, created_at, updated_at, deleted_at)
SELECT 'seed-food-leche-descremada-surlat', 'Leche descremada Surlat',
       'leche descremada surlat', 33, 3.3, 4.8, 0.1,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       NULL
WHERE NOT EXISTS (
  SELECT 1 FROM foods
  WHERE id = 'seed-food-leche-descremada-surlat'
     OR name_normalized = 'leche descremada surlat'
);

INSERT INTO foods (id, name, name_normalized, kcal, protein, carbs, fat, created_at, updated_at, deleted_at)
SELECT 'seed-food-hamburguesa-light-crianza', 'Hamburguesa de vacuno light La Crianza',
       'hamburguesa de vacuno light la crianza', 139, 16.7, 2.7, 6.8,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       NULL
WHERE NOT EXISTS (
  SELECT 1 FROM foods
  WHERE id = 'seed-food-hamburguesa-light-crianza'
     OR name_normalized = 'hamburguesa de vacuno light la crianza'
);

INSERT INTO foods (id, name, name_normalized, kcal, protein, carbs, fat, created_at, updated_at, deleted_at)
SELECT 'seed-food-ketchup-light', 'Ketchup light', 'ketchup light', 61, 1.4, 12.6, 0.5,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       NULL
WHERE NOT EXISTS (
  SELECT 1 FROM foods WHERE id = 'seed-food-ketchup-light' OR name_normalized = 'ketchup light'
);

INSERT INTO foods (id, name, name_normalized, kcal, protein, carbs, fat, created_at, updated_at, deleted_at)
SELECT 'seed-food-pechuga-pollo', 'Pechuga de pollo', 'pechuga de pollo', 95, 19.6, 1.1, 1.4,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       NULL
WHERE NOT EXISTS (
  SELECT 1 FROM foods WHERE id = 'seed-food-pechuga-pollo' OR name_normalized = 'pechuga de pollo'
);

INSERT INTO foods (id, name, name_normalized, kcal, protein, carbs, fat, created_at, updated_at, deleted_at)
SELECT 'seed-food-papa', 'Papa', 'papa', 85, 2.05, 17.6, 0.1,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       NULL
WHERE NOT EXISTS (
  SELECT 1 FROM foods WHERE id = 'seed-food-papa' OR name_normalized = 'papa'
);

INSERT INTO foods (id, name, name_normalized, kcal, protein, carbs, fat, created_at, updated_at, deleted_at)
SELECT 'seed-food-aceite-oliva', 'Aceite de oliva', 'aceite de oliva', 828, 0, 0, 92,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       NULL
WHERE NOT EXISTS (
  SELECT 1 FROM foods WHERE id = 'seed-food-aceite-oliva' OR name_normalized = 'aceite de oliva'
);

INSERT INTO foods (id, name, name_normalized, kcal, protein, carbs, fat, created_at, updated_at, deleted_at)
SELECT 'seed-food-huevo', 'Huevo', 'huevo', 150, 13, 1, 11,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       NULL
WHERE NOT EXISTS (
  SELECT 1 FROM foods WHERE id = 'seed-food-huevo' OR name_normalized = 'huevo'
);

INSERT INTO foods (id, name, name_normalized, kcal, protein, carbs, fat, created_at, updated_at, deleted_at)
SELECT 'seed-food-avena-tradicional', 'Avena tradicional', 'avena tradicional', 389, 17, 66.3, 7,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       CAST(strftime('%s', 'now') AS INTEGER) * 1000,
       NULL
WHERE NOT EXISTS (
  SELECT 1 FROM foods
  WHERE id = 'seed-food-avena-tradicional' OR name_normalized = 'avena tradicional'
);
