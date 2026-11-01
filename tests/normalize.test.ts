import { describe, expect, it } from "vitest";

import { matchesFoodQuery, normalizeText } from "@/lib/normalize";

describe("búsqueda de alimentos", () => {
  it("normaliza tildes, mayúsculas y espacios", () => {
    expect(normalizeText("  Pechuga  de  POLLO ")).toBe("pechuga de pollo");
    expect(normalizeText("Plátano")).toBe("platano");
    expect(normalizeText("Avena   integral")).toBe("avena integral");
  });

  it("encuentra por comienzo de cualquier palabra", () => {
    const query = normalizeText("pollo");
    expect(matchesFoodQuery("Pechuga de pollo", query)).toBe(true);
    expect(matchesFoodQuery("Pollo entero", query)).toBe(true);
    expect(matchesFoodQuery("Arroz integral", query)).toBe(false);
  });

  it("ignora tildes al buscar", () => {
    expect(matchesFoodQuery("Plátano maduro", normalizeText("platano"))).toBe(true);
  });

  it("devuelve todo con una consulta vacía", () => {
    expect(matchesFoodQuery("Cualquier alimento", "")).toBe(true);
  });
});
