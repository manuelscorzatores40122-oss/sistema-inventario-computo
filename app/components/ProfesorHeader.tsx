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
      <div className={styles.panel}>
        {/* MARCA */}


        
        <div className={styles.brand}>
          <div className={styles.logo}>
            <img
              src="/logo.png"
              alt="Logo del colegio"
              className={styles.logoImagen}
            />
          </div>

          <div className={styles.brandTexto}>
            <h1 className={styles.titulo}>Panel del Profesor</h1>
            <span className={`${styles.sub} ${styles.subMovil}`}>Hola, {primerNombre}</span>
            <span className={`${styles.sub} ${styles.subEscritorio}`}>Sistema de Inventario</span>
          </div>
        </div>


        {/* NAVEGACIÓN (barra lateral en escritorio; en móvil la da la barra inferior) */}
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
                    <span className={styles.linkIcono}>
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span>{title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* SALIR */}
        <button
          type="button"
          className={styles.logout}
          title="Cerrar sesión"
          aria-label="Salir"
          onClick={cerrarSesion}
        >
          <span className={styles.logoutIcono}>
            <FiLogOut size={20} aria-hidden="true" />
          </span>
          <span className={styles.logoutTexto}>Salir</span>
        </button>
      </div>
    </header>
  );
}
