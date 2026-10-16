export type InboxItem = { key: string; title: string; message: string; date: string; tone: 'green' | 'amber' | 'red' | 'blue'; href: string; action: string };
export function presentNotification(row: { id: number; mensaje: string; tipo: string; referencia_id?: number | null; fecha_envio: string }, admin: boolean): InboxItem {
  const types: Record<string, [string, InboxItem['tone'], string, string]> = {
    solicitud_aprobada: ['Tu solicitud fue aprobada', 'green', '/profesor/solicitudes', 'Ver respuesta'],
    solicitud_rechazada: ['Hay una respuesta a tu solicitud', 'red', '/profesor/solicitudes', 'Leer comentario'],
    solicitud_cancelada: ['Solicitud cancelada', 'amber', admin ? '/admin/solicitudes' : '/profesor/solicitudes', 'Ver solicitud'],
    solicitud_creada: ['Nueva solicitud de recursos', 'blue', '/admin/solicitudes', 'Revisar solicitud'],
    registro_profesor: ['Un docente solicita acceso', 'amber', '/admin/solicitudes#cuentas', 'Revisar cuenta'],
    prestamo_registrado: ['Equipo asignado a tu cuenta', 'green', '/profesor/solicitudes?tab=prestamos', 'Ver préstamo'],
    cuenta_aprobada: ['Tu cuenta ya está habilitada', 'green', '/profesor/dashboard', 'Ir a mi espacio'],
  };
  const [title, tone, base, action] = types[row.tipo] || ['Novedad de tu colegio', 'blue', admin ? '/admin/dashboard' : '/profesor/solicitudes', 'Ver actividad'];
  const href = !admin && row.tipo.startsWith('solicitud_') && row.referencia_id ? `${base}?solicitud=${row.referencia_id}` : base;
  return { key: `db-${row.id}`, title, message: row.mensaje, date: row.fecha_envio, tone, href, action };
}
