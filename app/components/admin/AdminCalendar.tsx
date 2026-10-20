"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  FiCalendar,
  FiPlus,
  FiRefreshCw,
  FiSettings,
  FiTrash2,
} from "react-icons/fi";
import MonthCalendar from "../teacher/MonthCalendar";
import { Modal } from "../teacher/TeacherUi";
import {
  dateLabel,
  overlaps,
  reservationsForDate,
  schoolDate,
  weekday,
  type Reservation,
} from "@/app/lib/teacher-utils";
import { adminWrite, useAdminData, type Slot } from "./useAdminData";
import s from "./AdminWorkspace.module.css";
type Edit = {
  id?: number;
  date: string;
  teacher: string;
  reason: string;
  start: string;
  end: string;
  recurring: boolean;
};
export default function AdminCalendar() {
  const { data, loading, refreshing, error, refresh } = useAdminData();
  const [date, setDate] = useState(schoolDate),
    [month, setMonth] = useState(() => schoolDate().slice(0, 7) + "-01");
  const [edit, setEdit] = useState<Edit | null>(null),
    [remove, setRemove] = useState<Reservation | null>(null),
    [template, setTemplate] = useState<Slot[] | null>(null);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [formError, setFormError] = useState("");
  const schedule = data?.schedule || [],
    agenda = reservationsForDate(schedule, date);
  const openedReservation = useRef(false);
  useEffect(() => {
    if (!data || openedReservation.current) return;
    const id = new URLSearchParams(window.location.search).get("reserva");
    const reservation = data.schedule.find(row => String(row.id) === id);
    if (!reservation?.fecha_reserva) return;
    openedReservation.current = true;
    const selected = reservation.fecha_reserva.slice(0, 10);
    setDate(selected);
    setMonth(selected.slice(0, 7) + "-01");
    setMessage(reservation.estado === "separado"
      ? "Reserva aprobada y registrada en el calendario. Estás viendo el día solicitado."
      : "Estás viendo el día de la solicitud seleccionada.");
  }, [data]);
  const teachers = (data?.teachers || []).filter((t) => t.activo);
  const fixed = schedule.filter(
    (r) => r.estado === "separado" && !r.fecha_reserva,
  );
  const pending = schedule.filter((r) => r.estado === "pendiente");
  const conflicts = edit
    ? reservationsForDate(
        schedule.filter((r) => r.id !== edit.id),
        edit.date,
      )
    : [];
  const collision = !!edit && overlaps(edit.start, edit.end, conflicts);
  function open(row?: Reservation) {
    setFormError("");
    setEdit(
      row
        ? {
            id: row.id,
            date: row.fecha_reserva?.slice(0, 10) || date,
            teacher: String(row.reservado_por || ""),
            reason: row.motivo_reserva || "",
            start: row.hora_inicio.slice(0, 5),
            end: row.hora_fin.slice(0, 5),
            recurring: !row.fecha_reserva,
          }
        : {
            date,
            teacher: "",
            reason: "",
            start: data?.template[0]?.hora_inicio || "08:00",
            end: data?.template[0]?.hora_fin || "08:45",
            recurring: false,
          },
    );
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    setFormError("");
    try {
      await adminWrite(
        edit.id ? `/api/disponibilidad/${edit.id}` : "/api/disponibilidad",
        {
          sala_nombre: edit.recurring ? "Horario de Clases" : "Sala de Cómputo",
          dia_semana: weekday(edit.date),
          hora_inicio: edit.start,
          hora_fin: edit.end,
          estado: "separado",
          reservado_por: Number(edit.teacher),
          motivo_reserva: edit.reason.trim(),
          fecha_reserva: edit.recurring ? null : edit.date,
          es_recurrente: edit.recurring,
        },
        edit.id ? "PUT" : "POST",
      );
      setDate(edit.date);
      setMonth(edit.date.slice(0, 7) + "-01");
      setEdit(null);
      setMessage(
        "Turno guardado. El horario ya está disponible para los docentes.",
      );
      await refresh();
      window.dispatchEvent(new Event("admin-requests-updated"));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo guardar.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function release() {
    if (!remove) return;
    setBusy(true);
    setFormError("");
    try {
      await adminWrite(`/api/disponibilidad/${remove.id}`, null, "DELETE");
      setRemove(null);
      setMessage("Turno liberado correctamente.");
      await refresh();
      window.dispatchEvent(new Event("admin-requests-updated"));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo liberar.");
    } finally {
      setBusy(false);
    }
  }
  async function saveTemplate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      await adminWrite("/api/horario/template", { template }, "POST");
      setTemplate(null);
      setMessage(
        "Turnos guardados para administración y profesores. Las reservas existentes conservan su horario.",
      );
      await refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <div>
          <span className={s.eyebrow}>PLANIFICACIÓN · SALA DE CÓMPUTO</span>
          <h1>Calendario de la sala</h1>
          <p>
            Elige un día del almanaque para consultar y organizar sus clases.
          </p>
        </div>
        <div className={s.actions}>
          <button
            className={s.secondary}
            disabled={refreshing}
            aria-label="Actualizar calendario"
            onClick={() => void refresh()}
          >
            <FiRefreshCw />
          </button>
          <button
            className={s.secondary}
            disabled={!data}
            onClick={() => {
              setTemplate(data!.template.map((r) => ({ ...r })));
              setFormError("");
            }}
          >
            <FiSettings />
            Configurar turnos
          </button>
          <button className={s.button} disabled={!data} onClick={() => open()}>
            <FiPlus />
            Asignar turno
          </button>
        </div>
      </header>
      {error && (
        <div className={s.notice} data-error role="alert">
          {error} {data && "Se muestra la última información disponible."}
        </div>
      )}
      {message && (
        <div className={s.notice} role="status">
          {message}
        </div>
      )}
      <div className={s.metrics}>
        {[
          { label: "Turnos del día seleccionado", value: agenda.length },
          { label: "Clases semanales", value: fixed.length },
          {
            label: "Reservas por fecha",
            value: schedule.filter(
              (r) =>
                r.fecha_reserva &&
                r.estado === "separado" &&
                r.fecha_reserva.slice(0, 10) >= schoolDate(),
            ).length,
          },
          { label: "Reservas por revisar", value: pending.length },
        ].map((r) => (
          <div className={s.metric} key={r.label}>
            <span>{r.label}</span>
            <strong>{data ? r.value : "—"}</strong>
          </div>
        ))}
      </div>
      {loading ? (
        <div className={s.empty} role="status">
          Cargando calendario…
        </div>
      ) : !data ? (
        <div className={s.empty}>
          <button className={s.secondary} onClick={() => void refresh()}>
            Volver a cargar
          </button>
        </div>
      ) : (
        <div className={s.calendarLayout}>
          <section className={s.panel}>
            <MonthCalendar
              admin
              month={month}
              onMonthChange={setMonth}
              value={date}
              onChange={setDate}
              reservations={schedule}
            />
          </section>
          <section className={s.panel}>
            <header className={s.panelHead}>
              <div>
                <span className={s.eyebrow}>AGENDA DEL DÍA</span>
                <h2 className={s.dateHeading}>
                  {dateLabel(date, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h2>
                <p>
                  {agenda.length} turnos ·{" "}
                  {date === schoolDate() ? "Hoy" : "Fecha seleccionada"}
                </p>
              </div>
            </header>
            {!agenda.length ? (
              <div className={s.empty}>
                <FiCalendar size={30} />
                <h3>Este día está libre</h3>
                <p>
                  Asigna un docente y la actividad que realizará en la sala.
                </p>
                <button
                  className={s.button}
                  style={{ marginTop: 16 }}
                  onClick={() => open()}
                >
                  <FiPlus />
                  Asignar en este día
                </button>
              </div>
            ) : (
              agenda.map((row) => {
                const linked = data.requests.some(
                  (r) =>
                    r.disponibilidad_id === row.id && r.estado === "aprobada",
                );
                return (
                  <article className={s.scheduleRow} key={row.id}>
                    <span className={s.tag}>
                      {row.estado === "pendiente"
                        ? "POR REVISAR"
                        : row.fecha_reserva
                          ? "RESERVA POR FECHA"
                          : "CLASE SEMANAL"}
                    </span>
                    <h3 className={s.agendaTime}>
                      {row.hora_inicio.slice(0, 5)} – {row.hora_fin.slice(0, 5)}
                    </h3>
                    <strong>
                      {row.motivo_reserva || "Clase en sala de cómputo"}
                    </strong>
                    <p>
                      {row.reservado_por_nombre} {row.reservado_por_apellido}
                    </p>
                    <p>
                      {!row.fecha_reserva
                        ? `Se repite cada ${row.dia_semana.toLowerCase()}`
                        : "Solo esta fecha"}
                    </p>
                    <div className={s.actions}>
                      {row.estado === "pendiente" ? (
                        <Link href="/admin/dashboard" className={s.button}>
                          Revisar solicitud →
                        </Link>
                      ) : (
                        <>
                          {!linked && (
                            <button
                              className={s.secondary}
                              onClick={() => open(row)}
                            >
                              Editar turno
                            </button>
                          )}
                          <button
                            className={s.danger}
                            onClick={() => {
                              setRemove(row);
                              setFormError("");
                            }}
                          >
                            Liberar turno
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })
            )}
            <div className={s.panelBody}>
              <p className={s.caption}>
                Las clases semanales se repiten en su día. Las reservas de
                profesores ocupan únicamente la fecha solicitada.
              </p>
              {agenda.length > 0 && (
                <button className={s.secondary} onClick={() => open()}>
                  <FiPlus />
                  Otro turno para este día
                </button>
              )}
            </div>
          </section>
        </div>
      )}
      {edit && (
        <Modal
          title={
            edit.id ? "Editar turno de la sala" : "Asignar turno de la sala"
          }
          onClose={() => setEdit(null)}
          busy={busy}
        >
          <form className={s.form} onSubmit={save}>
            <label>
              Frecuencia
              <select
                value={edit.recurring ? "weekly" : "date"}
                onChange={(e) =>
                  setEdit({ ...edit, recurring: e.target.value === "weekly" })
                }
              >
                <option value="date">Solo una fecha</option>
                <option value="weekly">Todas las semanas</option>
              </select>
            </label>
            <MonthCalendar
              admin
              compact
              month={(edit.date || date).slice(0, 7) + "-01"}
              onMonthChange={(next) => setEdit({ ...edit, date: next })}
              value={edit.date}
              onChange={(next) => setEdit({ ...edit, date: next })}
              reservations={schedule}
            />
            <label>
              {edit.recurring
                ? "Fecha de referencia para elegir el día de la semana"
                : "Fecha de la reserva"}
              <input
                required
                type="date"
                value={edit.date}
                onChange={(e) => setEdit({ ...edit, date: e.target.value })}
              />
            </label>
            {edit.recurring && (
              <div className={s.detail}>
                <p>
                  Se repetirá cada{" "}
                  <strong>
                    {edit.date
                      ? weekday(edit.date).toLowerCase()
                      : "día seleccionado"}
                  </strong>
                  . También se revisan cruces con reservas futuras de ese día.
                </p>
              </div>
            )}
            <label>
              Docente
              <select
                required
                value={edit.teacher}
                onChange={(e) => setEdit({ ...edit, teacher: e.target.value })}
              >
                <option value="">Selecciona un docente activo</option>
                {teachers.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.apellido}, {t.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Materia o actividad
              <input
                required
                maxLength={255}
                placeholder="Ej. Matemática · 3.º A"
                value={edit.reason}
                onChange={(e) => setEdit({ ...edit, reason: e.target.value })}
              />
            </label>
            <div>
              <p>Turnos del colegio</p>
              <div className={s.slots}>
                {data?.template.map((slot) => (
                  <button
                    key={slot.hora_inicio}
                    type="button"
                    disabled={overlaps(
                      slot.hora_inicio,
                      slot.hora_fin,
                      conflicts,
                    )}
                    aria-pressed={
                      slot.hora_inicio === edit.start &&
                      slot.hora_fin === edit.end
                    }
                    onClick={() =>
                      setEdit({
                        ...edit,
                        start: slot.hora_inicio,
                        end: slot.hora_fin,
                      })
                    }
                  >
                    {slot.hora_inicio} – {slot.hora_fin}
                  </button>
                ))}
              </div>
            </div>
            <div className={s.formPair}>
              <label>
                Hora de inicio
                <input
                  required
                  type="time"
                  value={edit.start}
                  onChange={(e) => setEdit({ ...edit, start: e.target.value })}
                />
              </label>
              <label>
                Hora de fin
                <input
                  required
                  type="time"
                  value={edit.end}
                  onChange={(e) => setEdit({ ...edit, end: e.target.value })}
                />
              </label>
            </div>
            {collision && (
              <div className={s.notice} data-error role="alert">
                Ese horario ya está ocupado. Selecciona otro turno.
              </div>
            )}
            {formError && (
              <div className={s.notice} data-error role="alert">
                {formError}
              </div>
            )}
            <footer>
              <button
                type="button"
                className={s.secondary}
                disabled={busy}
                onClick={() => setEdit(null)}
              >
                Cancelar
              </button>
              <button
                className={s.button}
                disabled={
                  busy || collision || edit.start >= edit.end || !edit.date
                }
              >
                {busy ? "Guardando…" : "Guardar turno"}
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {remove && (
        <Modal
          title="Liberar turno"
          onClose={() => setRemove(null)}
          busy={busy}
        >
          <div className={s.form}>
            <div className={s.detail}>
              <strong>{remove.motivo_reserva}</strong>
              <p>
                {remove.hora_inicio.slice(0, 5)} – {remove.hora_fin.slice(0, 5)}
              </p>
              <p>
                {remove.fecha_reserva
                  ? dateLabel(remove.fecha_reserva)
                  : `Todos los ${remove.dia_semana.toLowerCase()}`}
              </p>
            </div>
            <p>
              {remove.fecha_reserva
                ? "La reserva quedará cancelada y el espacio volverá a estar disponible."
                : "Se eliminará la asignación semanal completa, en todas sus fechas."}
            </p>
            {formError && (
              <div className={s.notice} data-error role="alert">
                {formError}
              </div>
            )}
            <footer>
              <button
                className={s.secondary}
                disabled={busy}
                onClick={() => setRemove(null)}
              >
                Volver
              </button>
              <button
                className={s.danger}
                disabled={busy}
                onClick={() => void release()}
              >
                {busy ? "Liberando…" : "Confirmar liberación"}
              </button>
            </footer>
          </div>
        </Modal>
      )}
      {template && (
        <Modal
          title="Configurar turnos del colegio"
          onClose={() => setTemplate(null)}
          busy={busy}
        >
          <form className={s.form} onSubmit={saveTemplate}>
            <p>
              Define los bloques que podrán elegir administración y profesores.
              Las clases ya guardadas mantienen sus horas.
            </p>
            {template.map((slot, i) => (
              <div className={s.templateRow} key={i}>
                <label>
                  Inicio {i + 1}
                  <input
                    required
                    type="time"
                    value={slot.hora_inicio}
                    onChange={(e) =>
                      setTemplate(
                        template.map((r, j) =>
                          j === i ? { ...r, hora_inicio: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Fin {i + 1}
                  <input
                    required
                    type="time"
                    value={slot.hora_fin}
                    onChange={(e) =>
                      setTemplate(
                        template.map((r, j) =>
                          j === i ? { ...r, hora_fin: e.target.value } : r,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  className={s.danger}
                  type="button"
                  disabled={template.length === 1}
                  aria-label={`Eliminar turno ${i + 1}`}
                  onClick={() =>
                    setTemplate(template.filter((_, j) => j !== i))
                  }
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
            <button
              type="button"
              className={s.secondary}
              disabled={template.length >= 30}
              onClick={() =>
                setTemplate([
                  ...template,
                  {
                    hora_inicio: template.at(-1)?.hora_fin || "13:00",
                    hora_fin: "",
                  },
                ])
              }
            >
              <FiPlus />
              Añadir turno
            </button>
            {formError && (
              <div className={s.notice} data-error role="alert">
                {formError}
              </div>
            )}
            <footer>
              <button
                className={s.secondary}
                type="button"
                disabled={busy}
                onClick={() => setTemplate(null)}
              >
                Volver
              </button>
              <button className={s.button} disabled={busy}>
                {busy ? "Guardando…" : "Guardar configuración"}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </div>
  );
}
