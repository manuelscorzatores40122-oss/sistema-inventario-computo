'use client';

import Link from 'next/link';
import { FiHome, FiFileText, FiUser, FiLogOut, FiShield } from 'react-icons/fi';

import styles from './ProfesorHeader.module.css';
import { useProfesorHeader } from './useProfesorHeader';

const menuItems = [
  { href: '/profesor/dashboard', title: 'Dashboard', icon: FiHome },
  { href: '/profesor/solicitudes', title: 'Mis Solicitudes', icon: FiFileText },
  { href: '/profesor/perfil', title: 'Mi Perfil', icon: FiUser },
];

export default function ProfesorHeader() {
  const { nombre, primerNombre, inicial, isActive, cerrarSesion } = useProfesorHeader();

  return (
    <header className={styles.header}>
      <div className={styles.barra}>
        <div className={styles.container}>
          {/* MARCA */}
          <div className={styles.brand}>
            <div className={styles.logo}>
              <FiShield size={22} aria-hidden="true" />
            </div>

            <div className={styles.brandTexto}>
              <h1 className={styles.titulo}>Panel del Profesor</h1>
              <span className={`${styles.sub} ${styles.subMovil}`}>Hola, {primerNombre}</span>
              <span className={`${styles.sub} ${styles.subEscritorio}`}>Sistema de Inventario</span>
            </div>
          </div>

          {/* USUARIO + SALIR */}
          <div className={styles.usuario}>
            <div className={styles.avatar} aria-hidden="true">
              {inicial}
            </div>

            <div className={styles.usuarioInfo}>
              <div className={styles.usuarioNombre}>{nombre}</div>
              <div className={styles.usuarioRol}>Profesor</div>
            </div>

            <button
              type="button"
              className={styles.logout}
              title="Cerrar sesión"
              aria-label="Salir"
              onClick={cerrarSesion}
            >
              <FiLogOut size={18} aria-hidden="true" />
              <span className={styles.logoutTexto}>Salir</span>
            </button>
          </div>

          {/* NAVEGACIÓN (escritorio; en móvil la da la barra inferior) */}
          <nav className={styles.nav} aria-label="Principal">
            <ul className={styles.links}>
              {menuItems.map(({ href, title, icon: Icon }) => {
                const active = isActive(href);

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`${styles.link} ${active ? styles.linkActivo : ''}`}
                    >
                      <Icon size={16} aria-hidden="true" />
                      {title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}