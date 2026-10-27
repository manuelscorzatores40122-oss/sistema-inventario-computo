export type InboxItem = { key: string; title: string; message: string; date: string; tone: 'green' | 'amber' | 'red' | 'blue'; href: string; action: string; notificationType?: string };
export function presentNotification(row: { id: number; mensaje: string; tipo: string; referencia_id?: number | null; fecha_envio: string }, admin: boolean): InboxItem {
  const types: Record<string, [string, InboxItem['tone'], string, string]> = {
    solicitud_aprobada: ['Tu solicitud fue aprobada', 'green', '/profesor/solicitudes', 'Ver respuesta'],
    solicitud_rechazada: ['Tu solicitud fue rechazada', 'red', '/profesor/solicitudes', 'Leer comentario'],
    solicitud_cancelada: ['Solicitud cancelada', 'amber', admin ? '/admin/solicitudes' : '/profesor/solicitudes', 'Ver solicitud'],
    reserva_cancelada: ['Reserva de sala cancelada', 'amber', admin ? '/admin/horario' : '/profesor/horario', 'Ver calendario'],
    solicitud_creada: ['Nueva solicitud de recursos', 'blue', '/admin/solicitudes', 'Revisar solicitud'],
    registro_profesor: ['Un docente solicita acceso', 'amber', '/admin/solicitudes#cuentas', 'Revisar cuenta'],
    prestamo_registrado: ['Equipo asignado a tu cuenta', 'green', '/profesor/solicitudes?tab=prestamos', 'Ver préstamo'],
    cuenta_aprobada: ['Tu cuenta ya está habilitada', 'green', '/profesor/dashboard', 'Ir a mi espacio'],
  };
  const [title, tone, base, action] = types[row.tipo] || ['Novedad de tu colegio', 'blue', admin ? '/admin/dashboard' : '/profesor/solicitudes', 'Ver actividad'];
  const href = !admin && row.tipo.startsWith('solicitud_') && row.referencia_id ? `${base}?solicitud=${row.referencia_id}` : base;
  return { key: `db-${row.id}`, title, message: row.mensaje, date: row.fecha_envio, tone, href, action, notificationType: row.tipo };
}

/** Queue every new notice, including approvals delivered in the same response. */
export function newInboxItems(items: InboxItem[], seen: Set<string>): InboxItem[] {
  const fresh: InboxItem[] = [];
  for (const item of items) if (!seen.has(item.key)) { seen.add(item.key); fresh.push(item); }
  return fresh.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function activeInboxItem(queue: InboxItem[], preferApprovals = false): InboxItem | undefined {
  return (preferApprovals ? queue.find(item => item.notificationType === 'solicitud_aprobada') : undefined) || queue[0];
}
