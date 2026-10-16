"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiRefreshCw, FiSearch, FiUserPlus } from "react-icons/fi";
import { dateLabel, normalize } from "@/app/lib/teacher-utils";
import { Modal, Pagination } from "../teacher/TeacherUi";
import { adminWrite } from "./useAdminData";
import s from "./AdminWorkspace.module.css";

type Account = {
  id: number;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string;
  area: string | null;
  telefono: string | null;
  correo_personal: string | null;
  estado_registro: "pendiente" | "aprobada" | "rechazada";
  fecha_creacion: string;
  updated_at: string;
};
export default function AccountRequestsInbox() {
  const [rows, setRows] = useState<Account[] | null>(null);
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false),
    [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"pendientes" | "resueltas">("pendientes");
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1);
  const [decision, setDecision] = useState<{
    row: Account;
    estado: "aprobada" | "rechazada";
  } | null>(null);
  const [decisionError, setDecisionError] = useState("");
  const inFlight = useRef(false),
    mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const response = await fetch("/api/solicitudes/cuentas", {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error || "No se pudieron cargar las solicitudes de cuenta.",
        );
      if (mounted.current) {
        setRows(body.cuentas || []);
        setError("");
      }
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "No hay conexión.");
    } finally {
      inFlight.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(update, 20000);
    window.addEventListener("admin-users-updated", update);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener("admin-users-updated", update);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh]);
  async function save() {
    if (!decision || busy) return;
    setBusy(true);
    setDecisionError("");
    try {
      const result = await adminWrite(
        `/api/solicitudes/cuentas/${decision.row.id}`,
        { estado: decision.estado },
      );
      setRows(
        (previous) =>
          previous?.map((row) =>
            row.id === decision.row.id
              ? { ...row, estado_registro: decision.estado }
              : row,
          ) || null,
      );
      setMessage(result.message);
      setDecision(null);
      window.dispatchEvent(new Event("admin-users-updated"));
    } catch (e) {
      setDecisionError(e instanceof Error ? e.message : "No se pudo guardar.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  const pending =
    rows?.filter((row) => row.estado_registro === "pendiente") || [];
  const filtered = (rows || []).filter(
    (row) =>
      (tab === "pendientes"
        ? row.estado_registro === "pendiente"
        : row.estado_registro !== "pendiente") &&
      normalize(
        `${row.nombre} ${row.apellido} ${row.dni || row.email} ${row.area || ""}`,
      ).includes(normalize(search)),
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 6)),
  );
  return (
    <section
      id="cuentas"
      aria-labelledby="account-inbox-heading"
      className={`${s.page} ${s.panel}`}
      style={{ padding: 0, marginBottom: 28, scrollMarginTop: 85 }}
    >
      <header className={s.panelHead}>
        <div>
          <span className={s.eyebrow}>ACCESO DE DOCENTES</span>
          <h2 id="account-inbox-heading">
            <FiUserPlus /> Solicitudes de cuenta{" "}
            {rows && `· ${pending.length} pendientes`}
          </h2>
          <p>
            Las solicitudes enviadas desde el registro llegan aquí. Aprueba el
            acceso o rechaza la solicitud.
          </p>
        </div>
        <button
          className={s.secondary}
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          <FiRefreshCw />
          {refreshing ? "Actualizando…" : "Actualizar cuentas"}
        </button>
      </header>
      {error && (
        <div
          role="alert"
          className={s.notice}
          data-error
          style={{ margin: 16 }}
        >
          {error}
        </div>
      )}
      {message && (
        <div role="status" className={s.notice} style={{ margin: 16 }}>
          {message}
        </div>
      )}
      <div className={s.tabs} aria-label="Estado de solicitudes de cuenta">
        <button
          aria-pressed={tab === "pendientes"}
          onClick={() => {
            setTab("pendientes");
            setPage(1);
          }}
        >
          Cuentas pendientes {rows ? `· ${pending.length}` : ""}
        </button>
        <button
          aria-pressed={tab === "resueltas"}
          onClick={() => {
            setTab("resueltas");
            setPage(1);
          }}
        >
          Cuentas revisadas {rows ? `· ${rows.length - pending.length}` : ""}
        </button>
      </div>
      <label className={s.search}>
        <FiSearch />
        <input
          aria-label="Buscar solicitud de cuenta"
          placeholder="Buscar nombre, DNI o área…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </label>
      {!rows ? (
        <div className={s.empty} role="status">
          {error
            ? "No se pudo cargar la bandeja de cuentas."
            : "Cargando solicitudes de cuenta…"}
        </div>
      ) : !filtered.length ? (
        <div className={s.empty}>
          <h3>
            {search
              ? "Sin coincidencias"
              : tab === "pendientes"
                ? "No hay cuentas pendientes de revisión"
                : "Todavía no hay cuentas revisadas"}
          </h3>
          <p>
            Esta bandeja se actualiza automáticamente al recibir nuevos
            registros.
          </p>
        </div>
      ) : (
        filtered.slice((currentPage - 1) * 6, currentPage * 6).map((row) => (
          <article key={row.id} className={s.row}>
            <div>
              <span className={s.tag}>
                {row.estado_registro === "pendiente"
                  ? "CREACIÓN DE CUENTA"
                  : row.estado_registro === "aprobada"
                    ? "CUENTA APROBADA"
                    : "SOLICITUD RECHAZADA"}
              </span>
              <h3>
                {row.nombre} {row.apellido}
              </h3>
              <p>
                DNI: {row.dni || row.email} · {row.area || "Área no indicada"}
              </p>
              <small>
                Solicitada{" "}
                {dateLabel(row.fecha_creacion, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </small>
            </div>
            {row.estado_registro === "pendiente" && (
              <div className={s.actions}>
                <button
                  className={s.button}
                  onClick={() => {
                    setDecision({ row, estado: "aprobada" });
                    setDecisionError("");
                  }}
                  aria-label={`Aprobar cuenta de ${row.nombre} ${row.apellido}`}
                >
                  Aprobar cuenta
                </button>
                <button
                  className={s.danger}
                  onClick={() => {
                    setDecision({ row, estado: "rechazada" });
                    setDecisionError("");
                  }}
                  aria-label={`Rechazar cuenta de ${row.nombre} ${row.apellido}`}
                >
                  Rechazar
                </button>
              </div>
            )}
          </article>
        ))
      )}
      <div className={s.panelBody}>
        <Pagination
          page={currentPage}
          total={filtered.length}
          size={6}
          onChange={setPage}
        />
      </div>
      {decision && (
        <Modal
          title={
            decision.estado === "aprobada"
              ? "Aprobar solicitud de cuenta"
              : "Rechazar solicitud de cuenta"
          }
          busy={busy}
          onClose={() => setDecision(null)}
        >
          <div className={s.form}>
            <div className={s.detail}>
              <strong>
                {decision.row.nombre} {decision.row.apellido}
              </strong>
              <p>DNI: {decision.row.dni || decision.row.email}</p>
              <p>Área: {decision.row.area || "No indicada"}</p>
              <p>Teléfono: {decision.row.telefono || "No indicado"}</p>
              <p>Correo: {decision.row.correo_personal || "No indicado"}</p>
            </div>
            <p>
              {decision.estado === "aprobada"
                ? "El docente podrá ingresar con su DNI y la contraseña que eligió al solicitar su cuenta."
                : "La cuenta permanecerá sin acceso. La decisión se conservará en Cuentas revisadas."}
            </p>
            {decisionError && (
              <div role="alert" className={s.notice} data-error>
                {decisionError}
              </div>
            )}
            <footer>
              <button
                className={s.secondary}
                disabled={busy}
                onClick={() => setDecision(null)}
              >
                Volver
              </button>
              <button
                className={decision.estado === "aprobada" ? s.button : s.danger}
                disabled={busy}
                onClick={() => void save()}
              >
                {busy
                  ? "Guardando…"
                  : decision.estado === "aprobada"
                    ? "Confirmar aprobación"
                    : "Confirmar rechazo"}
              </button>
            </footer>
          </div>
        </Modal>
      )}
    </section>
  );
}
