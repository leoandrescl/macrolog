import { describe, expect, it } from "vitest";

import {
  addDays,
  dateFromKey,
  isValidDateKey,
  relativeDateLabel,
  toDateKey,
} from "@/lib/dates";

describe("dates", () => {
  it("serializa fechas locales sin pasar por UTC", () => {
    const date = new Date(2026, 10, 1, 23, 45);
    expect(toDateKey(date)).toBe("2026-11-01");
  });

  it("parsea y vuelve a serializar una fecha local", () => {
    const key = "2026-02-28";
    const date = dateFromKey(key);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(1);
    expect(date.getDate()).toBe(28);
    expect(toDateKey(date)).toBe(key);
  });

  it("suma días cruzando mes y año", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("rechaza fechas inexistentes o mal formadas", () => {
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("2026-13-01")).toBe(false);
    expect(isValidDateKey("01-11-2026")).toBe(false);
    expect(isValidDateKey("2026-11-01")).toBe(true);
  });

  it("etiqueta los días relativos con una fecha de referencia", () => {
    expect(relativeDateLabel("2026-11-01", "2026-11-01")).toBe("Hoy");
    expect(relativeDateLabel("2026-10-31", "2026-11-01")).toBe("Ayer");
    expect(relativeDateLabel("2026-11-02", "2026-11-01")).toBe("Mañana");
  });
});
