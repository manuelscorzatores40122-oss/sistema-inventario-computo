"use client";
import { useState } from "react";
import Link from "next/link";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiInbox,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import {
  dateLabel,
  normalize,
  reservationsForDate,
  schoolDate,
} from "@/app/lib/teacher-utils";
import { Modal } from "./teacher/TeacherUi";
import AdminQuickForm from "./AdminQuickForm";
import {
  adminWrite,
  useAdminData,
  type RequestRow,
  type LoanRow,
  type TeacherRow,
} from "./admin/useAdminData";
import s from "./admin/AdminWorkspace.module.css";
type Action =
  | { type: "request"; row: RequestRow }
  | { type: "delivery" | "return"; row: LoanRow }
  | { type: "account"; row: TeacherRow };
export default function AdminDashboard() {
  const { data, loading, refreshing, error, updated, refresh } = useAdminData();
  const [tab, setTab] = useState("requests"),
    [search, setSearch] = useState(""),
    [quick, setQuick] = useState(false);
  const [action, setAction] = useState<Action | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [actionError, setActionError] = useState("");
  const [comment, setComment] = useState(""),
    [condition, setCondition] = useState("bueno");
  const requests = (data?.requests || [])
    .filter((r) => r.estado === "pendiente")
    .sort((a, b) => a.fecha_solicitud.localeCompare(b.fecha_solicitud));
  const deliveries = (data?.loans || []).filter(
    (r) => r.estado === "pendiente",
  );
  const returns = (data?.loans || []).filter((r) => r.estado === "prestado");
  const accounts = (data?.teachers || []).filter((r) => r.estado_registro === 'pendiente');
  const agenda = reservationsForDate(data?.schedule || [], schoolDate());
  const attention = (data?.items || []).filter(
    (r) => r.estado === "mantenimiento" || Number(r.cantidad_disponible) === 0,
  );
  const tabs = [
    { key: "requests", label: "Solicitudes", rows: requests },
    { key: "deliveries", label: "Por entregar", rows: deliveries },
    { key: "returns", label: "En uso", rows: returns },
    { key: "accounts", label: "Solicitudes de cuenta", rows: accounts },
  ];
  const current = tabs.find((t) => t.key === tab)!;
  const filtered = current.rows.filter((row) =>
    normalize(JSON.stringify(row)).includes(normalize(search)),
  );
  function open(next: Action) {
    setAction(next);
    setComment("");
    setCondition("bueno");
    setActionError("");
  }
  async function save(decision?: "aprobada" | "rechazada") {
    if (!action) return;
    setBusy(true);
    setActionError("");
    try {
      if (action.type === "request")
        await adminWrite(`/api/solicitudes/${action.row.id}`, {
          estado: decision,
          comentarios: comment,
        });
      else if (action.type === "account")
        await adminWrite(`/api/usuarios/${action.row.id}`, { activo: true });
      else
        await adminWrite(`/api/prestamos/${action.row.id}`, {
          estado: action.type === "delivery" ? "prestado" : "devuelto",
          devolucion_estado: condition,
          devolucion_observacion: comment,
        });
      setNotice(
        action.type === "account"
          ? "Cuenta activada. El docente ya puede iniciar sesión."
          : action.type === "return"
            ? "Devolución registrada y stock actualizado."
            : action.type === "delivery"
              ? "Entrega confirmada. El equipo figura en uso."
              : decision === "aprobada"
                ? "Solicitud aprobada correctamente."
                : "Solicitud rechazada.",
      );
      setAction(null);
      await refresh();
      window.dispatchEvent(new Event("admin-requests-updated"));
      window.dispatchEvent(new Event("admin-users-updated"));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <div>
          <span className={s.eyebrow}>
            ADMINISTRACIÓN ·{" "}
            {dateLabel(schoolDate(), { day: "numeric", month: "long" })}
          </span>
          <h1>Centro de operaciones</h1>
          <p>Las tareas del colegio, listas para resolver.</p>
        </div>
        <div className={s.actions}>
          <button
            className={s.secondary}
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            <FiRefreshCw />
            {refreshing ? "Actualizando…" : "Actualizar"}
          </button>
          <button className={s.button} onClick={() => setQuick(true)}>
            <FiPlus />
            Nuevo préstamo
          </button>
        </div>
      </header>
      {error && (
        <div className={s.notice} data-error role="alert">
          {error} {data && "Se conserva la última información disponible."}
        </div>
      )}
      {notice && (
        <div className={s.notice} role="status">
          {notice}
        </div>
      )}
      <div className={s.metrics}>
        {[
          {
            title: "Solicitudes por revisar",
            value: requests.length,
            icon: FiInbox,
            key: "requests",
            hint: "Revisar y responder",
          },
          {
            title: "Equipos por entregar",
            value: deliveries.length,
            icon: FiPackage,
            key: "deliveries",
            hint: "Confirmar la entrega",
          },
          {
            title: "Préstamos en uso",
            value: returns.length,
            icon: FiClock,
            key: "returns",
            hint: "Registrar una devolución",
          },
          {
            title: "Solicitudes de cuenta",
            value: accounts.length,
            icon: FiUsers,
            key: "accounts",
            hint: "Revisar antes de activar",
          },
        ].map(({ title, value, icon: Icon, key, hint }) => (
          <button
            key={key}
            className={s.metric}
            data-alert={value > 0}
            onClick={() => {
              setTab(key);
              setSearch("");
              document
                .getElementById("work-queue")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <Icon size={20} />
            <span>{title}</span>
            <strong>{data ? value : "—"}</strong>
            <small>{hint} →</small>
          </button>
        ))}
      </div>
      <div className={s.columns}>
        <section
          className={s.panel}
          id="work-queue"
          style={{ scrollMarginTop: 80 }}
        >
          <header className={s.panelHead}>
            <div>
              <h2>Bandeja de trabajo</h2>
              <p>Resuelve cada tarea sin salir del panel.</p>
            </div>
            <span className={s.caption}>
              {updated ? `Actualizado ${updated}` : "Conectando…"}
            </span>
          </header>
          <div className={s.tabs} aria-label="Tipo de tarea">
            {tabs.map((t) => (
              <button
                key={t.key}
                aria-pressed={tab === t.key}
                onClick={() => {
                  setTab(t.key);
                  setSearch("");
                }}
              >
                {t.label} · {data ? t.rows.length : "—"}
              </button>
            ))}
          </div>
          <label className={s.search}>
            <FiSearch />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar docente o recurso…"
              aria-label="Buscar en la bandeja"
            />
          </label>
          {loading ? (
            <div className={s.empty} role="status">
              Cargando tareas…
            </div>
          ) : !data ? (
            <div className={s.empty}>
              No se pudo cargar la bandeja.
              <button className={s.secondary} onClick={() => void refresh()}>
                Reintentar
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className={s.empty}>
              <FiCheckCircle size={30} />
              <h3>
                {search ? "Sin coincidencias" : "Todo al día en esta bandeja"}
              </h3>
              <p>
                {tab === "accounts"
                  ? "Las solicitudes nuevas aparecen también en Solicitudes → Solicitudes de cuenta."
                  : "Las nuevas tareas aparecerán automáticamente."}
              </p>
            </div>
          ) : (
            filtered.slice(0, 20).map((row) => {
              if (tab === "accounts") {
                const r = row as TeacherRow;
                return (
                  <article className={s.row} key={r.id}>
                    <div>
                      <strong>
                        {r.nombre} {r.apellido}
                      </strong>
                      <p>
                        DNI: {r.dni || "Sin registrar"} · {r.area || "Sin área"}
                      </p>
                      <small>
                        Solicitud de cuenta · revisa la identidad del docente
                      </small>
                    </div>
                    <button
                      className={s.secondary}
                      onClick={() => open({ type: "account", row: r })}
                    >
                      Revisar cuenta
                    </button>
                  </article>
                );
              }
              if (tab === "requests") {
                const r = row as RequestRow;
                return (
                  <article className={s.row} key={r.id}>
                    <div>
                      <span className={s.tag}>
                        {r.disponibilidad_id ? "SALA DE CÓMPUTO" : "EQUIPO"} · #
                        {r.id}
                      </span>
                      <h3>{r.item_nombre || "Sala de cómputo"}</h3>
                      <p>
                        {r.profesor_nombre} {r.apellido} ·{" "}
                        {r.cantidad_solicitada} unidad(es)
                      </p>
                      <small>Recibida {dateLabel(r.fecha_solicitud)}</small>
                    </div>
                    <button
                      className={s.button}
                      onClick={() => open({ type: "request", row: r })}
                    >
                      Revisar <FiArrowRight />
                    </button>
                  </article>
                );
              }
              const r = row as LoanRow;
              return (
                <article className={s.row} key={r.id}>
                  <div>
                    <span className={s.tag}>PRÉSTAMO #{r.id}</span>
                    <h3>{r.item_nombre}</h3>
                    <p>
                      {r.profesor_nombre} {r.profesor_apellido} · {r.cantidad}{" "}
                      unidad(es)
                    </p>
                    <small>Registrado {dateLabel(r.fecha_prestamo)}</small>
                  </div>
                  <button
                    className={s.secondary}
                    onClick={() =>
                      open({
                        type: tab === "deliveries" ? "delivery" : "return",
                        row: r,
                      })
                    }
                  >
                    {tab === "deliveries"
                      ? "Confirmar entrega"
                      : "Registrar devolución"}
                  </button>
                </article>
              );
            })
          )}
          {filtered.length > 20 && (
            <div className={s.panelBody}>
              <Link
                href={
                  tab === "accounts"
                    ? "/admin/profesores"
                    : tab === "requests"
                      ? "/admin/solicitudes"
                      : "/admin/prestamos"
                }
                className={s.secondary}
              >
                Ver las {filtered.length} tareas en el módulo
              </Link>
            </div>
          )}
        </section>
        <aside className={s.side}>
          <section className={s.panel}>
            <header className={s.panelHead}>
              <div>
                <h2>
                  <FiCalendar /> Sala de cómputo hoy
                </h2>
                <p>
                  {dateLabel(schoolDate(), {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
              <Link href="/admin/horario">Abrir calendario →</Link>
            </header>
            {!data ? (
              <div className={s.empty}>Agenda sin cargar.</div>
            ) : !agenda.length ? (
              <div className={s.empty}>
                <FiCalendar size={26} />
                <h3>Sin clases ni reservas hoy</h3>
                <p>Asigna una clase desde el calendario mensual.</p>
                <Link href="/admin/horario" className={s.secondary}>
                  Planificar la sala
                </Link>
              </div>
            ) : (
              agenda.slice(0, 5).map((r) => (
                <div className={s.row} key={r.id}>
                  <div>
                    <strong className={s.agendaTime}>
                      {r.hora_inicio.slice(0, 5)} – {r.hora_fin.slice(0, 5)}
                    </strong>
                    <p>{r.motivo_reserva || "Clase en la sala"}</p>
                    <small>
                      {r.reservado_por_nombre} {r.reservado_por_apellido} ·{" "}
                      {r.estado === "pendiente" ? "En revisión" : "Confirmada"}
                    </small>
                  </div>
                </div>
              ))
            )}
            {agenda.length > 5 && (
              <div className={s.panelBody}>
                <Link href="/admin/horario">
                  Ver los {agenda.length} turnos
                </Link>
              </div>
            )}
          </section>
          <section className={s.panel}>
            <header className={s.panelHead}>
              <div>
                <h2>Atención al inventario</h2>
                <p>
                  {data
                    ? `${attention.length} artículos sin stock disponible o en mantenimiento`
                    : "Consultando stock real…"}
                </p>
              </div>
            </header>
            <div className={s.panelBody}>
              {attention.slice(0, 4).map((i) => (
                <div className={s.stock} key={i.id}>
                  <strong>{i.nombre}</strong>
                  <span>
                    {i.estado === "mantenimiento"
                      ? "Mantenimiento"
                      : "Sin disponibles"}
                  </span>
                </div>
              ))}
              {data && !attention.length && (
                <p>Sin alertas de disponibilidad.</p>
              )}
              <p className={s.caption}>
                Disponibles:{" "}
                {data
                  ? data.items.reduce(
                      (n, i) => n + Number(i.cantidad_disponible),
                      0,
                    )
                  : "—"}{" "}
                unidades. Revisa existencias antes de aprobar.
              </p>
              <Link href="/admin/inventario" className={s.secondary}>
                Gestionar inventario <FiArrowRight />
              </Link>
            </div>
          </section>
        </aside>
      </div>
      {quick && (
        <AdminQuickForm
          type="loan"
          onClose={() => setQuick(false)}
          onSaved={() => void refresh()}
        />
      )}
      {action && (
        <Modal
          title={
            action.type === "request"
              ? "Revisar solicitud"
              : action.type === "delivery"
                ? "Confirmar entrega"
                : action.type === "return"
                  ? "Registrar devolución"
                  : "Activar cuenta de docente"
          }
          onClose={() => setAction(null)}
          busy={busy}
        >
          <div className={s.form}>
            <div className={s.detail}>
              {action.type === "account" ? (
                <>
                  <strong>
                    {action.row.nombre} {action.row.apellido}
                  </strong>
                  <p>DNI: {action.row.dni || "Sin registrar"}</p>
                  <p>
                    Al activar esta cuenta permites el acceso del docente al
                    sistema.
                  </p>
                </>
              ) : (
                <>
                  <strong>{action.row.item_nombre || "Sala de cómputo"}</strong>
                  <p>
                    {action.row.profesor_nombre} · Registro #{action.row.id}
                  </p>
                  {action.type === "request" ? (
                    <>
                      <p>{action.row.motivo || "Sin motivo registrado"}</p>
                      <p>Cantidad: {action.row.cantidad_solicitada}</p>
                      {(action.row.seccion || action.row.numero_aula) && (
                        <p>
                          Destino: {action.row.seccion} {action.row.numero_aula}
                        </p>
                      )}
                    </>
                  ) : (
                    <p>Cantidad: {action.row.cantidad}</p>
                  )}
                </>
              )}
            </div>
            {action.type === "return" && (
              <label>
                Estado del equipo al recibirlo
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="bueno">Bueno</option>
                  <option value="regular">Regular</option>
                  <option value="malo">Malo · requiere mantenimiento</option>
                </select>
              </label>
            )}
            {(action.type === "request" || action.type === "return") && (
              <label>
                {action.type === "request"
                  ? "Respuesta para el docente (opcional)"
                  : "Observaciones de devolución (opcional)"}
                <textarea
                  value={comment}
                  maxLength={1000}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
            )}
            {action.type === "delivery" && (
              <p>
                Confirma únicamente cuando hayas entregado físicamente los
                equipos al docente.
              </p>
            )}
            {actionError && (
              <div role="alert" className={s.notice} data-error>
                {actionError}
              </div>
            )}
            <footer>
              <button
                disabled={busy}
                className={s.secondary}
                onClick={() => setAction(null)}
              >
                Volver
              </button>
              {action.type === "request" ? (
                <>
                  <button
                    disabled={busy}
                    className={s.danger}
                    onClick={() => void save("rechazada")}
                  >
                    Rechazar solicitud
                  </button>
                  <button
                    disabled={busy}
                    className={s.button}
                    onClick={() => void save("aprobada")}
                  >
                    {busy ? "Guardando…" : "Aprobar solicitud"}
                  </button>
                </>
              ) : (
                <button
                  disabled={busy}
                  className={s.button}
                  onClick={() => void save()}
                >
                  {busy
                    ? "Guardando…"
                    : action.type === "account"
                      ? "Activar cuenta"
                      : action.type === "delivery"
                        ? "Confirmar entrega"
                        : "Guardar devolución"}
                </button>
              )}
            </footer>
          </div>
        </Modal>
      )}
    </div>
  );
}
