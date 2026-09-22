'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  FiFileText,
  FiUser,
  FiArrowRight,
  FiPackage,
  FiSend,
  FiAlertCircle,
} from 'react-icons/fi';

import styles from './ProfesorDashboard.module.css';
import { useProfesorDashboard } from './useProfesorDashboard';

/* ============================================================
   TARJETA DE ACCESO RÁPIDO
============================================================ */

interface AccesoProps {
  href: string;
  kicker: string;
  titulo: string;
  descripcion: string;
  icono: ReactNode;
  destacado?: boolean;
}

function AccesoRapido({
  href,
  kicker,
  titulo,
  descripcion,
  icono,
  destacado,
}: AccesoProps) {
  return (
    <Link
      href={href}
      className={`${styles.card} ${styles.acceso}`}
    >
      <div>
        <div
          className={`${styles.kicker} ${
            destacado ? styles.kickerDestacado : ''
          }`}
        >
          {kicker}
        </div>

        <h2 className={styles.accesoTitulo}>
          {titulo}
        </h2>

        <p className={styles.accesoTexto}>
          {descripcion}
        </p>
      </div>

      <div className={styles.accesoPie}>
        <div className={styles.iconTile}>
          {icono}
        </div>

        <div className={styles.flecha}>
          <FiArrowRight
            size={18}
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}

/* ============================================================
   DASHBOARD DEL PROFESOR
============================================================ */

export default function ProfesorDashboard() {
  /* ----------------------------------------------------------
     NOMBRE DEL PROFESOR

     Importante:
     NO leemos localStorage durante el render.
     Esto evita el error de hidratación de Next.js.
  ---------------------------------------------------------- */

  const [primerNombre, setPrimerNombre] =
    useState('Profesor');

  useEffect(() => {
    try {
      const usuarioGuardado =
        localStorage.getItem('user');

      if (!usuarioGuardado) {
        return;
      }

      const usuario = JSON.parse(usuarioGuardado);

      const nombre =
        usuario?.nombre ||
        usuario?.name ||
        usuario?.nombres ||
        usuario?.nombre_completo ||
        '';

      if (nombre) {
        setPrimerNombre(
          String(nombre).trim().split(' ')[0]
        );
      }
    } catch (error) {
      console.error(
        'Error leyendo usuario:',
        error
      );
    }
  }, []);

  /* ----------------------------------------------------------
     DATOS DEL DASHBOARD
  ---------------------------------------------------------- */

  const {
    inventario,
    loading,
    enviando,
    selectedItem,
    itemSeleccionado,
    cantidad,
    motivo,
    feedback,
    totalDisponibles,
    puedeEnviar,
    seleccionarItem,
    cambiarCantidad,
    setMotivo,
    enviarSolicitud,
  } = useProfesorDashboard();

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */

  return (
    <div className={styles.root}>
      <main className={styles.bento}>


        {/* ==================================================
      {/* ==================================================
          MI PERFIL
      ================================================== */}

      <Link
        href="/profesor/perfil"
        className={styles.heroLink}
        aria-label="Ir a Mi Perfil"
      >
        <section
          className={styles.hero}
          aria-label="Mi Perfil"
        >
          <div className={styles.heroCabecera}>
            <h2 className={styles.heroTitulo}>
              Mi Perfil
            </h2>

            <div className={styles.heroIcono}>
              <FiUser
                size={22}
                aria-hidden="true"
              />
            </div>
          </div>

          <div>
            <p className={styles.heroNumero}>
              {primerNombre}
            </p>

            <p className={styles.heroCaption}>
              Ver y administrar mi cuenta
            </p>
          </div>
        </section>
      </Link>
        <AccesoRapido
          href="/profesor/solicitudes"
          kicker="Gestión"
          titulo="Mis solicitudes"
          descripcion="Revisa, crea y controla el estado de tus solicitudes de artículos."
          icono={
            <FiFileText
              size={22}
              aria-hidden="true"
            />
          }
          destacado
        />


        {/* ==================================================
            SOLICITAR ARTÍCULOS
        =================================================== */}

        <section
          className={`${styles.card} ${styles.formCard}`}
        >
          {/* CABECERA */}

          <div className={styles.formHeader}>
            <h2 className={styles.formTitulo}>
              <FiSend
                size={20}
                aria-hidden="true"
              />

              Solicitar artículos
            </h2>

            <p className={styles.formSubtitulo}>
              Selecciona un artículo del inventario
              y registra tu solicitud.
            </p>
          </div>

          {/* FORMULARIO */}

          <form
            className={styles.formBody}
            onSubmit={(e) => {
              e.preventDefault();
              enviarSolicitud();
            }}
            noValidate
          >
            <div className={styles.campos}>

              {/* ==========================================
                  ARTÍCULO
              =========================================== */}

              <div
                className={`${styles.campo} ${styles.campoArticulo}`}
              >
                <label
                  htmlFor="articulo"
                  className={styles.label}
                >
                  <FiPackage
                    size={16}
                    aria-hidden="true"
                  />

                  Artículo
                </label>

                <select
                  id="articulo"
                  value={selectedItem ?? ''}
                  onChange={(e) =>
                    seleccionarItem(
                      e.target.value
                    )
                  }
                  className={styles.control}
                >
                  <option value="">
                    Seleccionar artículo
                  </option>

                  {inventario.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={
                        item.cantidad_disponible <= 0
                      }
                    >
                      {item.nombre} —{' '}
                      {item.cantidad_disponible}{' '}
                      disponibles
                    </option>
                  ))}
                </select>

                {itemSeleccionado && (
                  <p className={styles.ayuda}>
                    Categoría:{' '}

                    <strong>
                      {itemSeleccionado.categoria}
                    </strong>
                  </p>
                )}
              </div>

              {/* ==========================================
                  CANTIDAD
              =========================================== */}

              <div className={styles.campo}>
                <label
                  htmlFor="cantidad"
                  className={styles.label}
                >
                  <FiAlertCircle
                    size={16}
                    aria-hidden="true"
                  />

                  Cantidad
                </label>

                <input
                  id="cantidad"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={
                    itemSeleccionado?.cantidad_disponible
                  }
                  value={cantidad}
                  onChange={(e) =>
                    cambiarCantidad(
                      e.target.value
                    )
                  }
                  className={styles.control}
                />
              </div>

              {/* ==========================================
                  MOTIVO
              =========================================== */}

              <div className={styles.campo}>
                <label
                  htmlFor="motivo"
                  className={styles.label}
                >
                  <FiFileText
                    size={16}
                    aria-hidden="true"
                  />

                  Motivo de solicitud
                </label>

                <input
                  id="motivo"
                  type="text"
                  value={motivo}
                  onChange={(e) =>
                    setMotivo(e.target.value)
                  }
                  className={styles.control}
                  placeholder="Ej. Reparación de equipos"
                />
              </div>
            </div>

            {/* ==================================================
                RESUMEN
            =================================================== */}

            {itemSeleccionado && (
              <div className={styles.resumen}>
                <div>
                  <div
                    className={
                      styles.resumenTitulo
                    }
                  >
                    Resumen de solicitud
                  </div>

                  <div>
                    {itemSeleccionado.nombre} ×{' '}
                    {cantidad}
                  </div>
                </div>

                <div>
                  Estado inicial:{' '}

                  <strong>
                    Pendiente de aprobación
                  </strong>
                </div>
              </div>
            )}

            {/* ==================================================
                MENSAJE
            =================================================== */}

            {feedback && (
              <div
                role="status"
                aria-live="polite"
                className={`${styles.feedback} ${
                  feedback.tipo === 'exito'
                    ? styles.feedbackExito
                    : styles.feedbackError
                }`}
              >
                {feedback.texto}
              </div>
            )}

            {/* ==================================================
                BOTONES
            =================================================== */}

            <div className={styles.acciones}>

              <button
                type="submit"
                disabled={!puedeEnviar}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                <FiSend
                  size={18}
                  aria-hidden="true"
                />

                {enviando
                  ? 'Enviando solicitud...'
                  : 'Enviar solicitud'}
              </button>

              <Link
                href="/profesor/solicitudes"
                className={`${styles.btn} ${styles.btnOutline}`}
              >
                <FiFileText
                  size={18}
                  aria-hidden="true"
                />

                Ver mis solicitudes
              </Link>

            </div>
          </form>
        </section>
      </main>

      {/* ======================================================
          FOOTER
      ======================================================= */}

      <footer className={styles.footer}>
        Sistema de Inventario — Panel del Profesor
      </footer>
    </div>
  );
}