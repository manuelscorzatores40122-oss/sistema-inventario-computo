import styles from './DeveloperCredit.module.css';

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
              <a href="https://github.com/darwin810" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://wa.me/51952112451" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp a Yerson Darwin">WhatsApp · +51 952 112 451</a>
            </div>
          </div>
          <div className={styles.person}>
            <strong>Hugo Ronal</strong>
            <div className={styles.personLinks}>
              <a href="https://github.com/marchaasillohugoronl-cyber" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://wa.me/51916352548" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp a Hugo Ronal">WhatsApp · +51 916 352 548</a>
            </div>
          </div>
        </div>
        <span className={styles.note}>Estudiantes de Ingeniería de Software</span>
      </div>
      <div className={styles.links}>
        <a href={repository} target="_blank" rel="noopener noreferrer">Ver código fuente</a>
      </div>
    </section>
  );
}
