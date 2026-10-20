import styles from './DeveloperCredit.module.css';

const github = 'https://github.com/manuelscorzatores40122-oss';
const repository = `${github}/sistema-inventario-computo`;

export default function DeveloperCredit({ placement = 'admin' }: { placement?: 'admin' | 'teacher' }) {
  return (
    <section className={`${styles.credit} ${placement === 'admin' ? styles.admin : styles.teacher}`} aria-label="Créditos del sistema">
      <div>
        <span className={styles.label}>Desarrollador del sistema</span>
        <strong>manuelscorzatores40122-oss</strong>
        <span className={styles.note}>Gestión de recursos educativos · I.E. Manuel Scorza</span>
      </div>
      <div className={styles.links}>
        <a href={github} target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href={repository} target="_blank" rel="noopener noreferrer">Ver código fuente</a>
      </div>
    </section>
  );
}
