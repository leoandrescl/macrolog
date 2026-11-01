import { useEffect, useState } from "react";

import { todayKey } from "@/lib/dates";
import type { DateKey } from "@/types/domain";

/** Mantiene el día actual sincronizado si la PWA queda abierta pasada la medianoche. */
export function useToday(): DateKey {
  const [today, setToday] = useState<DateKey>(() => todayKey());

  useEffect(() => {
    let timer: number | undefined;

    const scheduleMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        1,
      );
      timer = window.setTimeout(
        () => {
          setToday(todayKey());
          scheduleMidnight();
        },
        Math.max(nextMidnight.getTime() - now.getTime(), 1_000),
      );
    };

    const refresh = () => setToday(todayKey());

    scheduleMidnight();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return today;
}
