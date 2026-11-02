import { describe, expect, it } from "vitest";

import type { CloudSnapshot } from "@/lib/api";
import { mergeSnapshots } from "@/lib/cloudMerge";
import type { DiaryEntry, Profile } from "@/types/domain";

const profile = (id: string, updatedAt: number, name = id): Profile => ({
  id,
  name,
  color: "lime",
  goals: { kcal: 2000, protein: 150, carbs: 200, fat: 67 },
  updatedAt,
  createdAt: 1,
});

const entry = (id: string, updatedAt: number, grams = 100): DiaryEntry => ({
  id,
  profileId: "p1",
  date: "2026-11-01",
  mealId: "m1",
  foodId: "f1",
  foodName: "Food",
  grams,
  per100: { kcal: 100, protein: 10, carbs: 10, fat: 2 },
  createdAt: 1,
  updatedAt,
});

const empty = (): CloudSnapshot => ({
  activeProfileId: null,
  data: { profiles: [], meals: [], entries: [], meta: [] },
});

describe("merge de datos en la nube", () => {
  it("une registros nuevos de ambos dispositivos", () => {
    const local = empty();
    local.data.profiles = [profile("p1", 10)];
    local.data.entries = [entry("e1", 10)];

    const remote = empty();
    remote.data.profiles = [profile("p2", 20)];
    remote.data.entries = [entry("e2", 20)];

    const merged = mergeSnapshots(local, remote);

    expect(merged.data.profiles.map((item) => item.id)).toEqual(["p1", "p2"]);
    expect(merged.data.entries.map((item) => item.id)).toEqual(["e1", "e2"]);
  });

  it("conserva la versión más reciente cuando el mismo ID cambió en ambos", () => {
    const local = empty();
    local.data.profiles = [profile("p1", 10, "Versión local")];
    local.data.entries = [entry("e1", 50, 120)];

    const remote = empty();
    remote.data.profiles = [profile("p1", 20, "Versión remota")];
    remote.data.entries = [entry("e1", 40, 80)];

    const merged = mergeSnapshots(local, remote);

    expect(merged.data.profiles[0]?.name).toBe("Versión remota");
    expect(merged.data.entries[0]?.grams).toBe(120);
  });

  it("elige un perfil activo válido y ordena las colecciones", () => {
    const local = empty();
    local.activeProfileId = "p2";
    local.data.profiles = [profile("p2", 10)];

    const remote = empty();
    remote.activeProfileId = "p1";
    remote.data.profiles = [profile("p1", 10), profile("p3", 10)];
    remote.data.meta = [{ key: "activeProfileId", value: "p1" }];

    const merged = mergeSnapshots(local, remote);

    expect(merged.activeProfileId).toBe("p2");
    expect(merged.data.profiles.map((item) => item.id)).toEqual(["p1", "p2", "p3"]);
    expect(merged.data.meta).toContainEqual({
      key: "activeProfileId",
      value: "p2",
    });
  });

  it("no incluye alimentos en el snapshot privado de la cuenta", () => {
    const local = empty();
    const remote = empty();
    const merged = mergeSnapshots(local, remote);

    expect(merged.data).not.toHaveProperty("foods");
  });
});
