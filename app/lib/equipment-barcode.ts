export function equipmentPath(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Equipo inválido');
  return `/admin/equipos/${id}`;
}

export function equipmentBarcode(id: number) {
  equipmentPath(id);
  return `EQ-${id}`;
}

// The barcode only identifies a record; it never contains credentials or URLs.
export function readEquipmentBarcode(text: string): number | null {
  const match = /^EQ-([1-9]\d*)$/.exec(text.trim());
  const id = Number(match?.[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
