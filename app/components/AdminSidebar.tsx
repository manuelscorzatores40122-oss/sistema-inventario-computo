"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  FiGrid,
  FiPackage,
  FiUsers,
  FiCalendar,
  FiInbox,
  FiUser,
  FiLogOut,
  FiClock,
} from "react-icons/fi";
import { logout } from "@/app/lib/logout";
import NotificacionesBell from "./NotificacionesBell";
import s from "./admin/AdminWorkspace.module.css";
const menu = [
  ["/admin/dashboard", "Centro de operaciones", FiGrid],
  ["/admin/solicitudes", "Solicitudes", FiInbox],
  ["/admin/prestamos", "Préstamos y devoluciones", FiPackage],
  ["/admin/horario", "Calendario de la sala", FiCalendar],
  ["/admin/inventario", "Inventario", FiPackage],
  ["/admin/profesores", "Profesores y cuentas", FiUsers],
  ["/admin/historial", "Historial", FiClock],
  ["/admin/perfil", "Mi perfil", FiUser],
] as const;
export default function AdminSidebar() {
  const pathname = usePathname();
  const [name, setName] = useState("Administrador");
  useEffect(() => {
    try {
      setName(
        JSON.parse(localStorage.getItem("user") || "{}").nombre ||
          "Administrador",
      );
    } catch {}
  }, []);
  return (
    <aside className={s.sidebar} aria-label="Administración">
      <Link href="/admin/dashboard" className={s.brand}>
        <Image
          src="/logo.png"
          width={40}
          height={44}
          alt="Colegio Manuel Scorza"
        />
        <span>
          Manuel Scorza<small>Gestión de recursos</small>
        </span>
      </Link>
      <div className={s.identity}>
        <span className={s.avatar}>{name.charAt(0)}</span>
        <div>
          <strong>{name}</strong>
          <small>Administrador</small>
        </div>
        <NotificacionesBell />
      </div>
      <nav className={s.navigation} aria-label="Menú de administración">
        {[{title:"GESTIÓN DIARIA",items:menu.slice(0,4)},{title:"RECURSOS DEL COLEGIO",items:menu.slice(4,6)},{title:"CONSULTAS Y CUENTA",items:menu.slice(6)}].map(group => <div key={group.title} className={s.navGroup}><p>{group.title}</p>{group.items.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname.startsWith(href) ? "page" : undefined}
          >
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        ))}</div>)}
      </nav>
      <footer className={s.sidebarFooter}>
        <span>Inventario · Sala de cómputo</span>
        <button onClick={() => void logout()}>
          <FiLogOut size={18} />
          Cerrar sesión
        </button>
      </footer>
    </aside>
  );
}
