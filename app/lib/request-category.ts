export type RequestCategory = 'aula' | 'equipos';

export function requestCategory(request: { inventario_id?: number | null; disponibilidad_id?: number | null }): RequestCategory {
  return request.disponibilidad_id != null || request.inventario_id == null ? 'aula' : 'equipos';
}
