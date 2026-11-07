PRAGMA foreign_keys = ON;

-- Peso opcional de una porción casera. Se guarda en gramos enteros.
ALTER TABLE foods ADD COLUMN portion_grams INTEGER;

-- El pan integral del catálogo inicial usa una rebanada de 50 g como porción.
UPDATE foods
SET portion_grams = 50,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE id = 'seed-food-pan-integral-castano'
  AND portion_grams IS NULL;
