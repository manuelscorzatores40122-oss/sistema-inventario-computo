import styles from './DeveloperCredit.module.css';

const repository = 'https://github.com/manuelscorzatores40122-oss/sistema-inventario-computo';

export default function DeveloperCredit({ placement = 'admin' }: { placement?: 'admin' | 'teacher' }) {
  return (
    <section className={`${styles.credit} ${placement === 'admin' ? styles.admin : styles.teacher}`} aria-label="Créditos del sistema">
      <div>
        <span className={styles.label}>Desarrolladores</span>
        <div className={styles.people}>
          <strong>Yerdson Darwin Solon</strong>
          <a href="https://github.com/darwin810" target="_blank" rel="noopener noreferrer">GitHub · darwin810</a>
          <strong>Hugo Ronal</strong>
          <a href="https://github.com/marchaasillohugoronl-cyber" target="_blank" rel="noopener noreferrer">GitHub · marchaasillohugoronl-cyber</a>
        </div>
        <span className={styles.note}>Estudiantes de Ingeniería de Software · I.E. Manuel Scorza</span>
      </div>
      <div className={styles.links}>
        <a href={repository} target="_blank" rel="noopener noreferrer">Ver código fuente</a>
      </div>
    </section>
  );
}
