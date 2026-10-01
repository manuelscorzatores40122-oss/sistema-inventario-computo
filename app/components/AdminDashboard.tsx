'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FiInbox, FiPackage, FiUsers, FiCheckCircle, FiXCircle, FiArrowRight, FiUser, FiSearch, FiCalendar, FiClock } from 'react-icons/fi';
import styles from './AdminDashboard.module.css';
import AdminQuickForm from './AdminQuickForm';

interface Solicitud {
  id: number;
  profesor_nombre: string;
  item_nombre: string | null;
  cantidad_solicitada: number;
  estado: string;
  fecha_solicitud: string;
}
interface Item { id: number; nombre: string; categoria: string; cantidad_total: number; cantidad_disponible: number }

export default function AdminDashboard() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [profesores, setProfesores] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ id: number; nombre: string } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [quickForm, setQuickForm] = useState<'loan' | 'classroom' | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const responses = await Promise.all(['/api/solicitudes', '/api/inventario', '/api/usuarios?role=profesor&activo=true'].map(url => fetch(url)));
      if (responses.some(response => !response.ok)) throw new Error('No se pudieron cargar los datos del panel. Intenta nuevamente.');
      const [requests, inventory, teachers] = await Promise.all(responses.map(response => response.json()));
      setSolicitudes(requests.solicitudes || []);
      setItems(inventory.items || []);
      setProfesores(teachers.total ?? teachers.usuarios?.length ?? 0);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el panel.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem('user') || 'null')); } catch { /* La sesión se valida en el middleware. */ }
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    void refresh();
    const update = () => { void refresh(); };
    window.addEventListener('admin-requests-updated', update);
    return () => { clearInterval(timer); window.removeEventListener('admin-requests-updated', update); };
  }, [refresh]);

  const decide = async (id: number, estado: 'aprobada' | 'rechazada') => {
    setBusy(id);
    try {
      const response = await fetch(`/api/solicitudes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado, admin_id: user?.id }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'No se pudo actualizar la solicitud.'); }
      window.dispatchEvent(new Event('admin-requests-updated'));
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al actualizar la solicitud.'); }
    finally { setBusy(null); }
  };

  const pending = solicitudes.filter(s => s.estado === 'pendiente');
  const visible = pending.filter(s => `${s.profesor_nombre} ${s.item_nombre || 'Sala de cómputo'}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const total = items.reduce((sum, item) => sum + Number(item.cantidad_total), 0);
  const available = items.reduce((sum, item) => sum + Number(item.cantidad_disponible), 0);
  const percent = total ? Math.round(available / total * 100) : 0;
  const states = [{ label: 'Aprobadas', value: solicitudes.filter(s => s.estado === 'aprobada').length }, { label: 'Pendientes', value: pending.length }, { label: 'Rechazadas', value: solicitudes.filter(s => s.estado === 'rechazada').length }];
  const metric = (value: number) => loading || error ? '—' : value.toLocaleString('es-PE');

  return (
    <div className={styles.dashboard}>
      {quickForm && <AdminQuickForm type={quickForm} onClose={() => setQuickForm(null)} onSaved={() => { void refresh(); }} />}
      <header className={styles.topbar}>
        <label className={styles.search}><FiSearch size={18} /><input aria-label="Buscar solicitudes pendientes" placeholder="Buscar profesor o artículo…" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <Link href="/admin/perfil" className={styles.profile}><span>{user?.nombre || 'Administrador'}</span><span className={styles.avatar}><FiUser size={18} /></span></Link>
      </header>
      <div className={styles.content}>
        <div className={styles.heading}><div><span className={styles.eyebrow}>VISTA GENERAL</span><h1>Dashboard</h1><p>Todo lo que necesitas para gestionar tu inventario.</p></div><span className={styles.date}><FiCalendar />{now?.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        {error && <div role="alert" className={styles.error}>{error} <button onClick={() => void refresh()}>Reintentar</button></div>}
        <div className={styles.metrics}>
          {[{ label: 'Solicitudes pendientes', value: pending.length, icon: FiInbox, href: '/admin/solicitudes' }, { label: 'Unidades en inventario', value: total, icon: FiPackage, href: '/admin/inventario' }, { label: 'Profesores activos', value: profesores, icon: FiUsers, href: '/admin/profesores' }].map(({ label, value, icon: Icon, href }) => <Link key={label} href={href} className={styles.metric}><Icon size={30} /><span>{label}</span><strong>{metric(value)}</strong><small>Ver detalle <FiArrowRight /></small></Link>)}
        </div>
        <div className={styles.grid}>
          <section className={`${styles.card} ${styles.loanShortcut} ${styles.shortcut}`}>
            <span className={styles.shortcutIcon}><FiPackage size={30} /></span>
            <h2>Préstamos de equipos</h2>
            <p>Registra la entrega de un equipo o artículo a un profesor.</p>
            <button type="button" onClick={() => setQuickForm('loan')} className={styles.shortcutButton}>Realizar un préstamo <FiArrowRight /></button>
          </section>
          <section className={`${styles.card} ${styles.calendar}`}><div className={styles.cardHeading}><h2>Hoy en el colegio</h2><FiCalendar /></div><div className={styles.calendarBody}><div><span>{now?.toLocaleDateString('es-PE', { month: 'long' }) || '—'}</span><strong>{now?.getDate().toString().padStart(2, '0') || '—'}</strong><span>{now?.toLocaleDateString('es-PE', { weekday: 'long' })}</span></div><div><FiClock size={45} strokeWidth={1.3} /><b>{now?.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) || '—'}</b><Link href="/admin/horario">Ver horario <FiArrowRight /></Link></div></div></section>
          <section className={`${styles.card} ${styles.shortcut}`}>
            <span className={styles.shortcutIcon}><FiCalendar size={26} /></span>
            <h2>Reserva de aula</h2>
            <p>Consulta el horario y asigna un turno en la sala de cómputo.</p>
            <button type="button" onClick={() => setQuickForm('classroom')} className={styles.shortcutButton}>Separar aula <FiArrowRight /></button>
          </section>
          <section className={styles.card}><div className={styles.cardHeading}><h2>Estado de solicitudes</h2></div><div className={styles.progressList}>{states.map(state => <div key={state.label}><div><span>{state.label}</span><b>{metric(state.value)}</b></div><div className={styles.track}><span style={{ width: `${!loading && !error && solicitudes.length ? state.value / solicitudes.length * 100 : 0}%` }} /></div></div>)}</div><Link className={styles.footerLink} href="/admin/solicitudes">Ver solicitudes <FiArrowRight /></Link></section>
          <section className={styles.card}><div className={styles.cardHeading}><h2>Disponibilidad de stock</h2></div><div className={styles.donut} style={{ background: `conic-gradient(#ffad4f ${!loading && !error ? percent : 0}%, #ededed 0)` }}><div><strong>{loading || error || !total ? '—' : `${percent}%`}</strong><small>disponible</small></div></div><p className={styles.stockCaption}>{metric(available)} de {metric(total)} unidades</p></section>
        </div>
        <section className={`${styles.card} ${styles.requests}`}><div className={styles.cardHeading}><div><h2>Solicitudes pendientes <span className={styles.badge}>{metric(pending.length)}</span></h2><p>Revisa las solicitudes de los profesores.</p></div><Link href="/admin/solicitudes">Ver todas <FiArrowRight /></Link></div>
          {loading ? <p className={styles.empty} role="status">Cargando solicitudes…</p> : error ? <p className={styles.empty}>No se pudieron actualizar las solicitudes.</p> : visible.length === 0 ? <div className={styles.empty}><FiCheckCircle size={28} /><p>{search ? 'No hay solicitudes que coincidan con tu búsqueda.' : 'No hay solicitudes pendientes.'}</p></div> : <div className={styles.tableWrap}><table><thead><tr><th>Profesor</th><th>Artículo / espacio</th><th>Cantidad</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>{visible.map(s => <tr key={s.id}><td><span className={styles.initial}>{s.profesor_nombre?.charAt(0).toUpperCase()}</span>{s.profesor_nombre}</td><td>{s.item_nombre || 'Sala de cómputo'}</td><td>{s.cantidad_solicitada}</td><td>{new Date(s.fecha_solicitud).toLocaleDateString('es-PE')}</td><td><div className={styles.actions}><button disabled={busy !== null} onClick={() => void decide(s.id, 'aprobada')}><FiCheckCircle />{busy === s.id ? 'Procesando…' : 'Aprobar'}</button><button disabled={busy !== null} onClick={() => void decide(s.id, 'rechazada')}><FiXCircle />Rechazar</button></div></td></tr>)}</tbody></table></div>}
        </section>
        <footer className={styles.pageFooter}>Sistema de Inventario <span>Panel de administración</span></footer>
      </div>
    </div>
  );
}
