import styles from './DeveloperCredit.module.css';
import { FaGithub, FaWhatsapp } from 'react-icons/fa';

const repository = 'https://github.com/manuelscorzatores40122-oss/sistema-inventario-computo';

export default function DeveloperCredit({ placement = 'admin' }: { placement?: 'admin' | 'teacher' }) {
  return (
    <footer className={`${styles.credit} ${placement === 'admin' ? styles.admin : styles.teacher}`} aria-label="Pie de página y créditos del sistema">
      <div className={styles.inner}>
        <div className={styles.heading}>
          <img className={styles.logo} src="/logo.png" alt="" />
          <div className={styles.headingCopy}>
            <strong className={styles.systemName}>Sistema de Inventario</strong>
            <span className={styles.label}>Desarrollado por estudiantes de Ingeniería de Software</span>
          </div>
          <a className={styles.repository} href={repository} target="_blank" rel="noopener noreferrer">
            <FaGithub aria-hidden="true" /> <span>Ver código fuente</span>
          </a>
        </div>
        <div className={styles.people}>
          <div className={styles.person}>
            <strong>Yerson Darwin</strong>
            <div className={styles.personLinks}>
              <a className={styles.github} href="https://github.com/darwin810" target="_blank" rel="noopener noreferrer" aria-label="Ver GitHub de Yerson Darwin"><FaGithub aria-hidden="true" /> GitHub</a>
              <a className={styles.whatsapp} href="https://wa.me/51952112451" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp a Yerson Darwin"><FaWhatsapp aria-hidden="true" /> WhatsApp <span>+51 952 112 451</span></a>
            </div>
          </div>
          <div className={styles.person}>
            <strong>Hugo Ronal</strong>
            <div className={styles.personLinks}>
              <a className={styles.github} href="https://github.com/marchaasillohugoronl-cyber" target="_blank" rel="noopener noreferrer" aria-label="Ver GitHub de Hugo Ronal"><FaGithub aria-hidden="true" /> GitHub</a>
              <a className={styles.whatsapp} href="https://wa.me/51916352548" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp a Hugo Ronal"><FaWhatsapp aria-hidden="true" /> WhatsApp <span>+51 916 352 548</span></a>
            </div>
          </div>
        </div>
        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} · I.E. Manuel Scorza</span>
          <span>Gestión de recursos educativos</span>
        </div>
      </div>
    </footer>
  );
}
