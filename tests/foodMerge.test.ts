import { describe, expect, it } from "vitest";

import { mergeFoods, pickNewerRemoteFoods } from "@/lib/foodMerge";
import type { Food } from "@/types/domain";

const food = (
  id: string,
  updatedAt: number,
  name = id,
  deletedAt?: number,
  portionGrams?: number,
): Food => ({
  id,
  name,
  nameNormalized: name.toLowerCase(),
  per100: { kcal: 100, protein: 10, carbs: 10, fat: 2 },
  portionGrams,
  createdAt: 1,
  updatedAt,
  deletedAt,
});

describe("biblioteca global de alimentos", () => {
  it("detecta solo los alimentos remotos más nuevos", () => {
    const local = [food("f1", 10), food("f2", 30), food("f3", 5)];
    const remote = [
      food("f1", 20, "Remoto"),
      food("f2", 20, "Viejo"),
      food("f3", 5, "Igual"),
      food("f4", 1, "Nuevo"),
    ];

    expect(pickNewerRemoteFoods(local, remote).map((item) => item.id)).toEqual([
      "f1",
      "f4",
    ]);
  });

  it("propaga eliminaciones mediante tombstones más nuevos", () => {
    const local = [food("f1", 10)];
    const remote = [food("f1", 20, "Arroz", 20)];

    expect(pickNewerRemoteFoods(local, remote)).toEqual(remote);
  });

  it("une bibliotecas por ID conservando la versión más reciente", () => {
    const merged = mergeFoods(
      [food("f1", 20, "Arroz integral", undefined, 50), food("f2", 5, "Avena")],
      [food("f1", 10, "Arroz"), food("f3", 10, "Banana")],
    );

    expect(merged.map((item) => item.name)).toEqual([
      "Arroz integral",
      "Avena",
      "Banana",
    ]);
    expect(merged[0]?.portionGrams).toBe(50);
  });
});
