import styles from './DeveloperCredit.module.css';
import { FaGithub, FaWhatsapp } from 'react-icons/fa';

const repository = 'https://github.com/manuelscorzatores40122-oss/sistema-inventario-computo';

export default function DeveloperCredit({ placement = 'admin' }: { placement?: 'admin' | 'teacher' }) {
  return (
    <section className={`${styles.credit} ${placement === 'admin' ? styles.admin : styles.teacher}`} aria-label="Créditos del sistema">
      <div>
        <span className={styles.label}>Desarrolladores</span>
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
        <span className={styles.note}>Estudiantes de Ingeniería de Software</span>
      </div>
      <div className={styles.links}>
        <a href={repository} target="_blank" rel="noopener noreferrer"><FaGithub aria-hidden="true" /> Código del sistema</a>
      </div>
    </section>
  );
}
