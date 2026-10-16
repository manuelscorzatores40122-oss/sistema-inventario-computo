'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiCheckCircle, FiInfo, FiMapPin, FiMonitor, FiPackage, FiSearch, FiSend } from 'react-icons/fi';
import { normalize } from '@/app/lib/teacher-utils';
import { useTeacher, type Equipment } from './TeacherContext';
import { DataBoundary, EmptyState, Modal, Notice, PageHeading, Pagination, RefreshButton } from './TeacherUi';
import s from './TeacherWorkspace.module.css';

export default function TeacherEquipment() {
  const { data, refresh } = useTeacher();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [section, setSection] = useState('');
  const [room, setRoom] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<number | null>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { const id = Number(new URLSearchParams(window.location.search).get('equipo')); if (id) setSelected(id); }, []);
  const available = data?.inventory.filter(row => row.cantidad_disponible > 0) || [];
  const categories = Array.from(new Set(available.map(item => item.categoria).filter(Boolean)));
  const filtered = available.filter(item => (category === 'Todas' || item.categoria === category) && normalize(`${item.nombre} ${item.categoria} ${item.marca || ''} ${item.modelo || ''}`).includes(normalize(search))) || [];
  const item = available.find(row => row.id === selected);
  useEffect(() => { setPage(current => Math.min(current, Math.max(1, Math.ceil(filtered.length / 12)))); }, [filtered.length]);
  useEffect(() => { if (data && category !== 'Todas' && !data.inventory.some(row => row.cantidad_disponible > 0 && row.categoria === category)) setCategory('Todas'); }, [data, category]);
  const canRequest = (row: Equipment) => row.estado === 'disponible' && row.cantidad_disponible > 0;
  const choose = (row: Equipment) => {
    setSelected(row.id); setQuantity(1); setError('');
    if (window.innerWidth < 768) { form.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); window.setTimeout(() => document.getElementById('equipment-quantity')?.focus({ preventScroll: true }), 300); }
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    setError('');
    if (!item || !canRequest(item)) { setError('Selecciona un equipo disponible.'); return; }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > item.cantidad_disponible) { setError('La cantidad debe ser un número entero dentro del stock disponible.'); return; }
    if (!section.trim() && !room.trim()) { setError('Indica la sección o el aula donde utilizarás el equipo.'); return; }
    if (!reason.trim()) { setError('Cuéntanos brevemente para qué necesitas el equipo.'); return; }
    lock.current = true; setBusy(true);
    try {
      const response = await fetch('/api/solicitudes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo_solicitud: 'equipo', inventario_id: item.id, cantidad_solicitada: quantity, motivo: reason.trim(), seccion: section.trim(), numero_aula: room.trim() }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No pudimos enviar la solicitud.');
      setSubmitted(body.solicitud.id); setSelected(null); setQuantity(1); setSection(''); setRoom(''); setReason('');
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Ocurrió un error de conexión. Conservamos tus datos para que puedas reintentar.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <>
    <PageHeading eyebrow="RECURSOS EDUCATIVOS" title="Un equipo para cada idea" description="Explora el inventario y solicita lo que necesitas para tu clase." actions={<RefreshButton />} />
    <DataBoundary>
      <div className={s.catalogLayout}>
        <section aria-label="Catálogo de equipos"><div className={s.toolbar}><div className={s.search}><FiSearch size={16} /><input aria-label="Buscar equipos" placeholder="Buscar equipo, marca o categoría…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></div><span className={s.eyebrow}>{filtered.length} recursos</span></div>
          <div className={s.chips} aria-label="Categorías">{['Todas', ...categories].map(value => <button key={value} aria-pressed={category === value} onClick={() => { setCategory(value); setPage(1); }}>{value}</button>)}</div>
          {!filtered.length ? <div className={s.card}><EmptyState title={available.length ? "No encontramos equipos" : "No hay equipos disponibles"} description={available.length ? "Prueba otra palabra o cambia la categoría." : "Los equipos aparecerán aquí cuando tengan unidades disponibles."}><button className={s.secondary} onClick={() => { setSearch(''); setCategory('Todas'); setPage(1); }}>Limpiar filtros</button></EmptyState></div> : <div className={s.catalog}>{filtered.slice((page - 1) * 12, page * 12).map(row => <button key={row.id} type="button" className={s.equipment} aria-pressed={selected === row.id} aria-label={`Seleccionar ${row.nombre}`} onClick={() => choose(row)} disabled={!canRequest(row)}>
            <div className={s.equipmentImage}>{row.imagen_url ? <img src={row.imagen_url} alt={row.nombre} loading="lazy" /> : <FiMonitor size={45} strokeWidth={1} />}<span className={s.badge} data-tone={canRequest(row) ? 'green' : 'gray'}>{canRequest(row) ? 'Disponible' : row.estado === 'mantenimiento' ? 'Mantenimiento' : 'Sin stock'}</span></div>
            <div className={s.equipmentCopy}><small>{row.categoria || 'Equipo'}</small><strong>{row.nombre}</strong><p>{[row.marca, row.modelo].filter(Boolean).join(' · ') || 'Recurso del centro de cómputo'}</p><div className={s.equipmentFoot}><span>{row.cantidad_disponible} disponibles</span>{selected === row.id ? <FiCheckCircle size={17} /> : <FiArrowRight size={17} />}</div></div>
          </button>)}</div>}
          <Pagination page={page} total={filtered.length} size={12} onChange={setPage} />
        </section>
        <form ref={form} id="equipment-request" className={`${s.card} ${s.sticky}`} onSubmit={submit}>
          <div className={s.cardHead}><div><h2>Tu solicitud</h2><p>Completa los datos de uso.</p></div><FiSend color="#719080" size={18} /></div>
          <div className={s.cardBody}>
            {error && <Notice tone="error">{error}</Notice>}
            <div className={s.selection}><FiPackage color="#58856e" size={25} /><div><strong>{item?.nombre || 'Selecciona un equipo'}</strong><small>{item ? `${item.cantidad_disponible} unidades disponibles` : 'Elige un recurso del catálogo.'}</small></div></div>
            <fieldset disabled={busy || !item} style={{ border: 0, padding: 0, margin: 0 }}>
              <div className={s.field}><label htmlFor="equipment-quantity">Cantidad de unidades</label><input id="equipment-quantity" type="number" required min={1} max={item?.cantidad_disponible || 1} step={1} value={quantity} onChange={event => setQuantity(Number(event.target.value))} /></div>
              <div className={s.divider} /><p className={s.label}><FiMapPin size={14} /> ¿Dónde lo utilizarás?</p>
              <div className={s.formGrid}><div className={s.field}><label htmlFor="request-section">Sección</label><input id="request-section" placeholder="Ej. 3.º B" maxLength={60} value={section} onChange={event => setSection(event.target.value)} /></div><div className={s.field}><label htmlFor="request-room">N.º de aula</label><input id="request-room" placeholder="Ej. 204" maxLength={30} value={room} onChange={event => setRoom(event.target.value)} /></div></div>
              <div className={s.field}><label htmlFor="equipment-reason">Actividad o motivo</label><textarea id="equipment-reason" placeholder="Ej. Proyección de material para la clase de Ciencias." required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /><small>Indica la sección o el aula y describe la actividad.</small></div>
              <button type="submit" className={`${s.button} ${s.full}`} disabled={!item || !canRequest(item) || busy}><FiSend size={15} />{busy ? 'Enviando solicitud…' : 'Enviar solicitud'}</button>
            </fieldset>
            <div className={s.info} style={{ margin: '17px 0 0', padding: 13 }}><FiInfo size={16} /><div>Administración revisará tu solicitud. Podrás seguir la respuesta en <Link href="/profesor/solicitudes" className={s.textLink}>Mis solicitudes</Link>.</div></div>
          </div>
        </form>
      </div>
    </DataBoundary>
    {submitted && <Modal title="Solicitud enviada" onClose={() => setSubmitted(null)}><div className={s.successBox}><FiCheckCircle size={45} /><h2>Todo listo. Solicitud #{submitted}</h2><p>Tu solicitud está en revisión. Te avisaremos aquí cuando administración responda.</p><Link href={`/profesor/solicitudes?solicitud=${submitted}`} className={s.button}>Ver mi solicitud <FiArrowRight /></Link><button className={`${s.secondary} ${s.full}`} style={{ marginTop: 10 }} onClick={() => setSubmitted(null)}>Seguir explorando</button></div></Modal>}
  </>;
}
