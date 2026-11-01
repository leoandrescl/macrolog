import { createContext, type ReactNode, useContext, useMemo } from "react";

import { setActiveProfileId } from "@/db/db";
import type { Profile } from "@/types/domain";

interface ProfileContextValue {
  profiles: Profile[];
  activeProfile: Profile;
  setActiveProfile: (id: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({
  profiles,
  activeProfile,
  children,
}: {
  profiles: Profile[];
  activeProfile: Profile;
  children: ReactNode;
}) {
  const value = useMemo<ProfileContextValue>(
    () => ({
      profiles,
      activeProfile,
      setActiveProfile: setActiveProfileId,
    }),
    [profiles, activeProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile debe usarse dentro de ProfileProvider.");
  }
  return context;
}
