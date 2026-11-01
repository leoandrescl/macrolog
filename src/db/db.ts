import Dexie, { type Table } from "dexie";

import { DB_NAME } from "@/lib/constants";
import type { DiaryEntry, Food, MealBlock, MetaRow, Profile } from "@/types/domain";

export class MacroLogDB extends Dexie {
  profiles!: Table<Profile, string>;
  foods!: Table<Food, string>;
  meals!: Table<MealBlock, string>;
  entries!: Table<DiaryEntry, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super(DB_NAME);

    this.version(1).stores({
      profiles: "id, name, createdAt",
      foods: "id, nameNormalized, createdAt",
      meals: "id, profileId, [profileId+sortOrder], archivedAt",
      entries:
        "id, profileId, mealId, foodId, [profileId+date], [profileId+date+mealId], [profileId+createdAt]",
      meta: "key",
    });
  }
}

export const db = new MacroLogDB();

export async function getActiveProfileId(): Promise<string | null> {
  const row = await db.meta.get("activeProfileId");
  return typeof row?.value === "string" ? row.value : null;
}

export async function setActiveProfileId(id: string): Promise<void> {
  await db.meta.put({ key: "activeProfileId", value: id });
}
