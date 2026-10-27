'use client';

import { useMemo, useState, useEffect } from 'react';
import { useNotificationCenter } from '@/app/lib/useNotificationCenter';
import { presentNotification, type InboxItem } from '@/app/lib/notification-presentation';
import NotificationCenter, { ActivityToast } from './NotificationCenter';
export { isLoanOverdue, getDaysOverdue } from '@/app/lib/useNotificationCenter';

export function useAdminInbox() {
  const center = useNotificationCenter();
  const items = useMemo<InboxItem[]>(() => {
    const notices = center.notificaciones.map(row => presentNotification(row, true));
    const keys = new Set(center.notificaciones.map(row => `${row.tipo}-${row.referencia_id}`));
    for (const row of center.solicitudes) if (!keys.has(`solicitud_creada-${row.id}`)) notices.push({ key: `request-${row.id}`, title: 'Una solicitud necesita tu respuesta', message: `${row.profesor_nombre} ${row.apellido || ''} solicita ${row.item_nombre || 'la sala de cómputo'}.`, date: row.fecha_solicitud, tone: 'blue', href: '/admin/solicitudes', action: 'Revisar solicitud' });
    for (const row of center.usuarios) if (!keys.has(`registro_profesor-${row.id}`)) notices.push({ key: `account-${row.id}`, title: 'Un docente solicita acceso', message: `${row.nombre} ${row.apellido} tiene una cuenta pendiente de habilitación.`, date: row.fecha_creacion, tone: 'amber', href: '/admin/profesores/cuentas', action: 'Revisar cuenta' });
    for (const row of center.overdueLoans) notices.push({ key: `loan-${row.id}`, title: 'Revisar equipo en uso', message: `${row.profesor_nombre} ${row.apellido || ''} tiene ${row.item_nombre} a su cargo. Consulta el estado de la entrega.`, date: row.fecha_prestamo, tone: 'amber', href: '/admin/prestamos', action: 'Ver préstamo' });
    return notices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [center.notificaciones, center.solicitudes, center.usuarios, center.overdueLoans]);
  return { ...center, items };
}
export default function NotificacionesBell() {
  const { items } = useAdminInbox();
  const [id, setId] = useState(0);
  useEffect(() => { try { setId(JSON.parse(localStorage.getItem('user') || 'null')?.id || 0); } catch { /* Esperar una sesión válida. */ } }, []);
  return id ? <NotificationCenter items={items} userId={id} /> : null;
}
export function AdminActivityNotice() {
  const { items, loading } = useAdminInbox();
  return loading ? null : <ActivityToast items={items} />;
}
