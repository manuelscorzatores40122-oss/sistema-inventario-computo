'use client';

import { timeLabel } from '@/app/lib/time-label';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiCalendar, FiClock, FiDownload, FiMapPin, FiPackage, FiSearch, FiXCircle } from 'react-icons/fi';
import { dateLabel, normalize } from '@/app/lib/teacher-utils';
import { exportToCsv } from '@/app/lib/exportCsv';
import { useTeacher, type TeacherRequest, type TeacherLoan } from './TeacherContext';
import { DataBoundary, EmptyState, Modal, Notice, PageHeading, Pagination, RefreshButton, Status } from './TeacherUi';
import s from './TeacherWorkspace.module.css';

export default function TeacherRequests() {
  const { data, refresh } = useTeacher();
  const [tab, setTab] = useState('solicitudes');
  const [status, setStatus] = useState('todas');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<TeacherRequest | null>(null);
  const [cancel, setCancel] = useState<TeacherRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTab(params.get('tab') === 'prestamos' ? 'prestamos' : 'solicitudes');
    setStatus(params.get('estado') || 'todas');
  }, []);
  useEffect(() => {
    if (!data) return;
    const id = Number(new URLSearchParams(window.location.search).get('solicitud'));
    if (id) { setDetail(data.requests.find(row => row.id === id) || null); window.history.replaceState(null, '', '/profesor/solicitudes'); }
  }, [data]);
  const loans = tab === 'prestamos';
  const rows = (loans ? data?.loans : data?.requests) || [];
  const filtered = rows.filter(row => (status === 'todas' || row.estado === status) && normalize(`${row.item_nombre} ${row.id} ${'motivo' in row ? row.motivo || '' : row.detalle || ''}`).includes(normalize(search)));
  const pageRows = filtered.slice((page - 1) * 8, page * 8);
  const options = loans ? [['todas', 'Todos'], ['pendiente', 'Por recoger'], ['prestado', 'En uso'], ['devuelto', 'Devueltos'], ['cancelado', 'Cancelados']] : [['todas', 'Todas'], ['pendiente', 'En revisión'], ['aprobada', 'Aprobadas'], ['rechazada', 'No aprobadas'], ['cancelada', 'Canceladas']];
  const changeTab = (value: string) => { setTab(value); setStatus('todas'); setSearch(''); setPage(1); window.history.replaceState(null, '', value === 'prestamos' ? '/profesor/solicitudes?tab=prestamos' : '/profesor/solicitudes'); };
  async function cancelRequest() {
    if (!cancel || lock.current) return;
    lock.current = true; setBusy(true); setNotice(null);
    try {
      const response = await fetch(`/api/solicitudes/${cancel.id}/cancelar`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No pudimos cancelar la solicitud.');
      setCancel(null); setDetail(null); setNotice({ message: 'Solicitud cancelada. Si reservaste la sala, el turno ya está liberado.', tone: 'success' });
      await refresh();
    } catch (err) { setNotice({ message: err instanceof Error ? err.message : 'No hay conexión. Intenta nuevamente.', tone: 'error' }); }
    finally { lock.current = false; setBusy(false); }
  }
  function download() {
    exportToCsv(loans ? 'mis_prestamos' : 'mis_solicitudes', [
      { key: 'id', label: 'Número' }, { key: 'item_nombre', label: 'Recurso' }, { key: 'cantidad', label: 'Cantidad' },
      { key: 'estado', label: 'Estado' }, { key: 'fecha', label: 'Fecha' }, { key: 'detalle', label: 'Detalle' },
    ], filtered.map(row => ({ id: row.id, item_nombre: row.item_nombre, cantidad: 'cantidad' in row ? row.cantidad : row.cantidad_solicitada, estado: row.estado, fecha: dateLabel('fecha_prestamo' in row ? row.fecha_prestamo : row.fecha_solicitud, { year: 'numeric', month: '2-digit', day: '2-digit' }), detalle: 'motivo' in row ? row.motivo : row.detalle })));
  }
  return <>
    <PageHeading eyebrow="SEGUIMIENTO PERSONAL" title="Tus solicitudes, en orden" description="Consulta las respuestas de administración y los equipos que tienes a cargo." actions={<><RefreshButton /><Link className={s.button} href="/profesor/solicitar-articulo">Nueva solicitud <FiArrowRight size={15} /></Link></>} />
    <DataBoundary>
      {notice && !cancel && <Notice tone={notice.tone}>{notice.message}</Notice>}
      <div className={s.tabs} role="tablist" aria-label="Tipo de actividad"><button role="tab" aria-selected={!loans} onClick={() => changeTab('solicitudes')}>Mis solicitudes <span className={s.badge}>{data?.requests.length || 0}</span></button><button role="tab" aria-selected={loans} onClick={() => changeTab('prestamos')}>Mis préstamos <span className={s.badge}>{data?.loans.length || 0}</span></button></div>
      <div className={s.toolbar}><div className={s.search}><FiSearch size={16} /><input aria-label="Buscar en mi actividad" placeholder="Buscar por equipo, número o motivo…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></div><button className={s.secondary} onClick={download} disabled={!filtered.length}><FiDownload size={15} />Exportar CSV</button></div>
      <div className={s.chips} aria-label="Filtrar por estado">{options.map(([value, label]) => <button key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}>{label} {value !== 'todas' && <span>({rows.filter(row => row.estado === value).length})</span>}</button>)}</div>
      {loans && <Notice><strong>Entregas y devoluciones en el centro de cómputo</strong>Cuando tu equipo esté listo, acércate a recogerlo. Administración confirma la entrega y registra la devolución después de recibirlo.</Notice>}
      <div className={s.list}>
        {!pageRows.length ? <div className={s.card}><EmptyState title={search || status !== 'todas' ? 'No hay resultados con estos filtros' : loans ? 'Todavía no tienes préstamos' : 'Todavía no has enviado solicitudes'} description={search || status !== 'todas' ? 'Prueba otra búsqueda o consulta todos los estados.' : 'Solicita los recursos que necesitas y sigue aquí cada paso.'}>{search || status !== 'todas' ? <button className={s.secondary} onClick={() => { setSearch(''); setStatus('todas'); setPage(1); }}>Limpiar filtros</button> : <Link className={s.button} href="/profesor/solicitar-articulo">Explorar equipos</Link>}</EmptyState></div> : pageRows.map(row => {
          if ('fecha_prestamo' in row) {
            const loan = row as TeacherLoan;
            return <article className={`${s.card} ${s.requestCard}`} key={loan.id}><div className={s.requestTop}><span className={s.resourceIcon}><FiPackage size={22} /></span><div className={s.rowCopy}><span className={s.eyebrow}>PRÉSTAMO #{loan.id}</span><h2>{loan.item_nombre}</h2></div><Status value={loan.estado} loan /></div><div className={s.requestMeta}><span><FiPackage />{loan.cantidad} unidades</span><span><FiCalendar />Registrado el {dateLabel(loan.fecha_prestamo)}</span>{loan.fecha_devolucion && <span>Devuelto el {dateLabel(loan.fecha_devolucion)}</span>}</div><div className={s.requestFooter}><p>{loan.estado === 'pendiente' ? 'Tu equipo está reservado. Acércate a recogerlo.' : loan.estado === 'prestado' ? 'Equipo a tu cargo. Devuélvelo al terminar de utilizarlo.' : loan.estado === 'cancelado' ? 'Este préstamo fue cancelado por administración.' : 'Devolución registrada por administración.'}{loan.devolucion_observacion && ` Observación: ${loan.devolucion_observacion}`}</p></div></article>;
          }
          const request = row as TeacherRequest;
          return <article className={`${s.card} ${s.requestCard}`} key={request.id}><div className={s.requestTop}><span className={s.resourceIcon}>{request.disponibilidad_id ? <FiCalendar size={22} /> : <FiPackage size={22} />}</span><div className={s.rowCopy}><span className={s.eyebrow}>SOLICITUD #{request.id}</span><h2>{request.item_nombre}</h2></div><Status value={request.estado} /></div><div className={s.requestMeta}><span><FiCalendar />{dateLabel(request.fecha_solicitud)}</span>{request.disponibilidad_id ? <span><FiClock />{dateLabel(request.fecha_reserva || '')} · {timeLabel(request.hora_inicio)} – {timeLabel(request.hora_fin)}</span> : <><span><FiPackage />{request.cantidad_solicitada} unidades</span><span><FiMapPin />{[request.seccion, request.numero_aula ? `Aula ${request.numero_aula}` : ''].filter(Boolean).join(' · ')}</span></>}</div><div className={s.requestFooter}><p>{request.comentarios || request.motivo || 'Sin comentarios adicionales.'}</p><button className={s.secondary} onClick={() => setDetail(request)}>Ver detalle <FiArrowRight size={14} /></button></div></article>;
        })}
      </div><Pagination page={page} total={filtered.length} onChange={setPage} />
    </DataBoundary>
    {detail && <Modal title={`Solicitud #${detail.id}`} onClose={() => setDetail(null)}><Status value={detail.estado} /><h3 style={{ fontSize: 20, marginTop: 16 }}>{detail.item_nombre}</h3><dl className={s.detailGrid}><div><dt>Fecha de solicitud</dt><dd>{dateLabel(detail.fecha_solicitud)}</dd></div><div><dt>{detail.disponibilidad_id ? 'Fecha de reserva' : 'Cantidad'}</dt><dd>{detail.disponibilidad_id ? dateLabel(detail.fecha_reserva || '') : `${detail.cantidad_solicitada} unidades`}</dd></div><div><dt>{detail.disponibilidad_id ? 'Horario' : 'Lugar de uso'}</dt><dd>{detail.disponibilidad_id ? `${timeLabel(detail.hora_inicio)} – ${timeLabel(detail.hora_fin)}` : [detail.seccion, detail.numero_aula ? `Aula ${detail.numero_aula}` : ''].filter(Boolean).join(' · ')}</dd></div>{detail.fecha_aprobacion && <div><dt>Respuesta de administración</dt><dd>{dateLabel(detail.fecha_aprobacion)}</dd></div>}</dl><p className={s.label}>Actividad o motivo</p><p>{detail.motivo || 'Sin motivo adicional.'}</p>{detail.comentarios && <Notice><strong>Comentario de administración</strong>{detail.comentarios}</Notice>}{detail.estado === 'aprobada' && detail.inventario_id && <Notice tone="success">Tu solicitud fue aprobada. Consulta Mis préstamos para conocer el estado de la entrega.</Notice>}<div className={s.dialogActions}>{(detail.estado === 'pendiente' || (detail.estado === 'aprobada' && detail.disponibilidad_id && detail.fecha_reserva && Date.parse(`${detail.fecha_reserva.slice(0, 10)}T${detail.hora_inicio?.slice(0, 5)}:00-05:00`) > Date.now())) && <button className={s.danger} onClick={() => { setCancel(detail); setDetail(null); }}><FiXCircle />Cancelar solicitud</button>}<button className={s.secondary} onClick={() => setDetail(null)}>Cerrar detalle</button></div></Modal>}
    {cancel && <Modal title="¿Cancelar esta solicitud?" onClose={() => setCancel(null)} busy={busy}>{notice?.tone === 'error' && <Notice tone="error">{notice.message}</Notice>}<p>Se cancelará la solicitud <strong>#{cancel.id} de {cancel.item_nombre}</strong>. Si es una reserva de sala, el turno quedará disponible para otros docentes.</p><p>Después podrás crear una nueva solicitud si lo necesitas.</p><div className={s.dialogActions}><button className={s.secondary} disabled={busy} onClick={() => setCancel(null)}>Conservar solicitud</button><button className={s.danger} disabled={busy} onClick={() => void cancelRequest()}>{busy ? 'Cancelando…' : 'Sí, cancelar'}</button></div></Modal>}
  </>;
}
