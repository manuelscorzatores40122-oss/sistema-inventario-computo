import styles from './SystemFooter.module.css';

export default function SystemFooter({ placement = 'admin' }: { placement?: 'admin' | 'teacher' }) {
  return (
    <footer className={`${styles.footer} ${placement === 'admin' ? styles.admin : styles.teacher}`}>
      <span>© {new Date().getFullYear()} I.E. Manuel Scorza</span>
      <span>Todos los derechos reservados</span>
    </footer>
  );
}
