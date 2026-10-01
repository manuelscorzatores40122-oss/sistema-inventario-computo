'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { FiCalendar, FiCheckCircle, FiPackage, FiSearch, FiX } from 'react-icons/fi';
import styles from './AdminDashboard.module.css';

type Teacher = { id: number; nombre: string; apellido: string; dni?: string | null; area?: string | null };
type Equipment = { id: number; nombre: string; cantidad_disponible: number };
type Slot = { id: number; sala_nombre: string; dia_semana: string; hora_inicio: string; hora_fin: string };

export default function AdminQuickForm({ type, onClose, onSaved }: {
  type: 'loan' | 'classroom'; onClose: () => void; onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teacher, setTeacher] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherResultsOpen, setTeacherResultsOpen] = useState(false);
  const [activeTeacher, setActiveTeacher] = useState(-1);
  const [resource, setResource] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [detail, setDetail] = useState('');
  const isLoan = type === 'loan';
  const selected = equipment.find(item => item.id === Number(resource));

  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const searchTerms = normalize(teacherSearch).trim().split(/\s+/).filter(Boolean);
  const matchingTeachers = teachers.filter(person => {
    const searchable = normalize(`${person.nombre} ${person.apellido} ${person.dni || ''}`);
    return searchTerms.every(term => searchable.includes(term));
  });
  const chooseTeacher = (person: Teacher) => {
    setTeacher(String(person.id));
    setTeacherSearch(`${person.nombre} ${person.apellido}`);
    setTeacherResultsOpen(false);
    setActiveTeacher(-1);
  };

  useEffect(() => {
    if (teacherResultsOpen && activeTeacher >= 0) {
      document.getElementById(`quick-teacher-option-${activeTeacher}`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeTeacher, teacherResultsOpen]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const responses = await Promise.all([
          fetch('/api/usuarios?role=profesor&activo=true', { signal: controller.signal }),
          fetch(isLoan ? '/api/inventario?estado=disponible' : '/api/disponibilidad?estado=disponible', { signal: controller.signal }),
        ]);
        if (responses.some(response => !response.ok)) throw new Error('No se pudieron cargar las opciones. Cierra el formulario e intenta de nuevo.');
        const [users, resources] = await Promise.all(responses.map(response => response.json()));
        setTeachers(users.usuarios || []);
        if (isLoan) setEquipment((resources.items || []).filter((item: Equipment) => item.cantidad_disponible > 0));
        else setSlots(resources.disponibilidades || []);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Error al cargar los datos.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [isLoan]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    if (!teacher || !resource) { setError('Selecciona un profesor y el equipo o turno.'); return; }
    if (isLoan && (!Number.isInteger(quantity) || quantity < 1 || quantity > (selected?.cantidad_disponible || 0))) {
      setError('Ingresa una cantidad válida dentro del stock disponible.'); return;
    }
    if (!isLoan && !detail.trim()) { setError('Escribe la materia o motivo de la reserva.'); return; }
    submitting.current = true;
    setSaving(true);
    try {
      // Comprobar nuevamente el turno antes de reservarlo.
      if (!isLoan) {
        const check = await fetch(`/api/disponibilidad/${resource}`);
        const current = await check.json();
        if (!check.ok) throw new Error(current.error || 'No se pudo comprobar el turno.');
        if (current.disponibilidad?.estado !== 'disponible') {
          setSlots(previous => previous.filter(slot => slot.id !== Number(resource)));
          setResource('');
          throw new Error('Este turno ya no está disponible. Selecciona otro.');
        }
      }
      const response = await fetch(isLoan ? '/api/prestamos' : `/api/disponibilidad/${resource}`, {
        method: isLoan ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLoan
          ? { inventario_id: Number(resource), profesor_id: Number(teacher), cantidad: quantity, detalle: detail.trim() }
          : { estado: 'separado', reservado_por: Number(teacher), motivo_reserva: detail.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar. Intenta nuevamente.');
      setSuccess(isLoan ? 'Préstamo registrado correctamente.' : 'Aula separada correctamente.');
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo conectar. Intenta nuevamente.'); }
    finally { submitting.current = false; setSaving(false); }
  }

  return (
    <dialog ref={dialog} className={styles.formDialog} aria-labelledby="quick-form-title" onCancel={event => { event.preventDefault(); if (!submitting.current) onClose(); }}>
      <div className={styles.formHeader}>
        <span className={styles.shortcutIcon}>{isLoan ? <FiPackage size={25} /> : <FiCalendar size={25} />}</span>
        <div><h2 id="quick-form-title">{isLoan ? 'Realizar un préstamo' : 'Separar aula'}</h2><p>{isLoan ? 'Entrega de equipos a profesores' : 'Reserva un turno disponible de la sala'}</p></div>
        <button type="button" className={styles.closeForm} onClick={onClose} disabled={saving} aria-label="Cerrar formulario"><FiX size={22} /></button>
      </div>
      {success ? <div className={styles.formSuccess} role="status"><FiCheckCircle size={42} /><h3>{success}</h3><p>{isLoan ? 'El stock del panel se actualizará automáticamente.' : 'La reserva ya está registrada en el horario.'}</p><button type="button" className={styles.shortcutButton} onClick={onClose}>Volver al panel</button></div> : <form onSubmit={submit} className={styles.quickForm}>
        {error && <div className={styles.error} role="alert">{error}</div>}
        {loading && <p role="status">Cargando opciones…</p>}
        <fieldset disabled={loading || saving}>
          <label htmlFor="quick-teacher">Profesor</label>
          <div className={styles.teacherSearch}>
            <div className={styles.teacherSearchInput}>
              <FiSearch size={17} aria-hidden="true" />
              <input id="quick-teacher" role="combobox" autoComplete="off" required
                placeholder="Buscar por nombre, apellido o DNI…"
                aria-autocomplete="list" aria-expanded={teacherResultsOpen}
                aria-controls={teacherResultsOpen ? 'quick-teacher-results' : undefined}
                aria-activedescendant={teacherResultsOpen && activeTeacher >= 0 ? `quick-teacher-option-${activeTeacher}` : undefined}
                aria-describedby="quick-teacher-status"
                value={teacherSearch}
                onFocus={() => { setTeacherResultsOpen(true); setActiveTeacher(-1); }}
                onBlur={() => { setTeacherResultsOpen(false); setActiveTeacher(-1); }}
                onChange={event => { setTeacherSearch(event.target.value); setTeacher(''); setTeacherResultsOpen(true); setActiveTeacher(-1); }}
                onKeyDown={event => {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    setTeacherResultsOpen(true);
                    setActiveTeacher(previous => matchingTeachers.length ? (event.key === 'ArrowDown' ? (previous + 1) % matchingTeachers.length : previous <= 0 ? matchingTeachers.length - 1 : previous - 1) : -1);
                  } else if (event.key === 'Enter' && teacherResultsOpen) {
                    event.preventDefault();
                    if (activeTeacher >= 0 && matchingTeachers[activeTeacher]) chooseTeacher(matchingTeachers[activeTeacher]);
                    else if (matchingTeachers.length === 1) chooseTeacher(matchingTeachers[0]);
                  } else if (event.key === 'Escape' && teacherResultsOpen) {
                    event.preventDefault(); event.stopPropagation(); setTeacherResultsOpen(false); setActiveTeacher(-1);
                  }
                }} />
            </div>
            {teacherResultsOpen && <ul id="quick-teacher-results" role="listbox" aria-label="Profesores encontrados" className={styles.teacherResults}>
              {matchingTeachers.map((person, index) => <li key={person.id}
                id={`quick-teacher-option-${index}`} role="option" aria-selected={teacher === String(person.id)}
                className={index === activeTeacher ? styles.teacherResultActive : undefined}
                onMouseDown={event => event.preventDefault()}
                onClick={() => chooseTeacher(person)}>
                <span className={styles.teacherInitial}>{person.nombre.charAt(0)}{person.apellido.charAt(0)}</span>
                <span><strong>{person.nombre} {person.apellido}</strong><small>{[person.dni ? `DNI ${person.dni}` : '', person.area].filter(Boolean).join(' · ') || 'Profesor'}</small></span>
                {teacher === String(person.id) && <FiCheckCircle aria-hidden="true" />}
              </li>)}
            </ul>}
            <p id="quick-teacher-status" className={styles.teacherSearchStatus} role="status">
              {loading ? 'Cargando profesores…' : teacher ? 'Profesor seleccionado.' : teacherResultsOpen ? matchingTeachers.length ? `${matchingTeachers.length} resultado${matchingTeachers.length === 1 ? '' : 's'}. Selecciona un profesor.` : 'No se encontraron profesores.' : 'Escribe y selecciona un profesor de los resultados.'}
            </p>
          </div>
          <label htmlFor="quick-resource">{isLoan ? 'Equipo / artículo' : 'Aula y turno disponible'}</label>
          <select id="quick-resource" value={resource} onChange={event => { setResource(event.target.value); setQuantity(1); }} required><option value="">{isLoan ? 'Seleccionar equipo' : 'Seleccionar turno'}</option>{isLoan ? equipment.map(item => <option key={item.id} value={item.id}>{item.nombre} · {item.cantidad_disponible} disponibles</option>) : slots.map(slot => <option key={slot.id} value={slot.id}>{slot.sala_nombre} · {slot.dia_semana} · {slot.hora_inicio.slice(0, 5)}–{slot.hora_fin.slice(0, 5)}</option>)}</select>
          {!loading && !(isLoan ? equipment.length : slots.length) && <p className={styles.formHint}>{isLoan ? 'No hay equipos con stock disponible.' : 'No hay turnos disponibles. Configura la disponibilidad desde Horario.'}</p>}
          {!loading && !teachers.length && <p className={styles.formHint}>No hay profesores activos para seleccionar.</p>}
          {isLoan && <><label htmlFor="quick-quantity">Cantidad</label><input id="quick-quantity" type="number" min="1" max={selected?.cantidad_disponible || 1} step="1" value={quantity} onChange={event => setQuantity(Number(event.target.value))} required /></>}
          <label htmlFor="quick-detail">{isLoan ? 'Detalle de la unidad (opcional)' : 'Materia o motivo de la reserva'}</label>
          <textarea id="quick-detail" rows={3} value={detail} onChange={event => setDetail(event.target.value)} required={!isLoan} placeholder={isLoan ? 'Ej. Laptop P2, control N.º 3…' : 'Ej. Clase de computación de segundo grado'} />
        </fieldset>
        <div className={styles.formFooter}><button type="button" className={styles.cancelForm} onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className={styles.shortcutButton} disabled={loading || saving || !teacher || !resource}>{saving ? 'Guardando…' : isLoan ? 'Registrar préstamo' : 'Confirmar reserva'}</button></div>
      </form>}
    </dialog>
  );
}
