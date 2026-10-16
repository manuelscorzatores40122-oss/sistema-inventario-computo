export type SchoolSlot = { hora_inicio: string; hora_fin: string };
export const DEFAULT_SCHOOL_SLOTS: SchoolSlot[] = [
  { hora_inicio: "08:00", hora_fin: "08:45" },
  { hora_inicio: "08:45", hora_fin: "09:30" },
  { hora_inicio: "09:45", hora_fin: "10:30" },
  { hora_inicio: "10:30", hora_fin: "11:15" },
  { hora_inicio: "11:30", hora_fin: "12:15" },
  { hora_inicio: "12:15", hora_fin: "13:00" },
];
export function parseSchoolSlots(
  value: unknown,
  fallback = DEFAULT_SCHOOL_SLOTS,
): SchoolSlot[] {
  try {
    const rows = typeof value === "string" ? JSON.parse(value) : value;
    if (
      Array.isArray(rows) &&
      rows.length &&
      rows.every(
        (row) =>
          row &&
          typeof row.hora_inicio === "string" &&
          typeof row.hora_fin === "string" &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(row.hora_inicio) &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(row.hora_fin) &&
          row.hora_inicio < row.hora_fin,
      )
    )
      return rows;
  } catch {
    /* Una plantilla dañada no debe impedir el acceso. */
  }
  return fallback;
}
