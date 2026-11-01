import { db, getActiveProfileId } from "@/db/db";
import { ACTIVE_PROFILE_KEY, DEFAULT_MEAL_NAMES } from "@/lib/constants";
import { createId } from "@/lib/id";
import type {
  MacroSplitPct,
  MealBlock,
  Nutrition,
  Profile,
  ProfileColor,
} from "@/types/domain";

export interface CreateProfileInput {
  name: string;
  color: ProfileColor;
  goals: Nutrition;
  macroSplitPct?: MacroSplitPct;
}

export async function createProfile(input: CreateProfileInput): Promise<Profile> {
  const now = Date.now();
  const profile: Profile = {
    id: createId(),
    name: input.name.trim(),
    color: input.color,
    goals: { ...input.goals },
    createdAt: now,
    updatedAt: now,
  };
  if (input.macroSplitPct) {
    profile.macroSplitPct = { ...input.macroSplitPct };
  }

  const meals: MealBlock[] = DEFAULT_MEAL_NAMES.map((name, index) => ({
    id: createId(),
    profileId: profile.id,
    name,
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
  }));

  await db.transaction("rw", db.profiles, db.meals, db.meta, async () => {
    await db.profiles.add(profile);
    await db.meals.bulkAdd(meals);
    await db.meta.put({ key: ACTIVE_PROFILE_KEY, value: profile.id });
  });

  return profile;
}

export async function updateProfile(
  id: string,
  input: CreateProfileInput,
): Promise<void> {
  await db.profiles.update(id, {
    name: input.name.trim(),
    color: input.color,
    goals: { ...input.goals },
    macroSplitPct: input.macroSplitPct ? { ...input.macroSplitPct } : undefined,
    updatedAt: Date.now(),
  });
}

export async function deleteProfile(id: string): Promise<void> {
  await db.transaction("rw", db.profiles, db.meals, db.entries, db.meta, async () => {
    await db.entries.where("profileId").equals(id).delete();
    await db.meals.where("profileId").equals(id).delete();
    await db.profiles.delete(id);

    const activeId = await getActiveProfileId();
    if (activeId !== id) return;

    const nextProfile = await db.profiles.orderBy("createdAt").first();
    if (nextProfile) {
      await db.meta.put({ key: ACTIVE_PROFILE_KEY, value: nextProfile.id });
    } else {
      await db.meta.delete(ACTIVE_PROFILE_KEY);
    }
  });
}
