import { FaGithub, FaWhatsapp } from 'react-icons/fa';
import styles from './DeveloperContacts.module.css';

const developers = [
  { name: 'Yerson Darwin', github: 'https://github.com/darwin810', phone: '+51 952 112 451', whatsapp: 'https://wa.me/51952112451' },
  { name: 'Hugo Ronal', github: 'https://github.com/marchaasillohugoronl-cyber', phone: '+51 916 352 548', whatsapp: 'https://wa.me/51916352548' },
];

export default function DeveloperContacts() {
  return (
    <section className={styles.panel} aria-labelledby="developer-contacts-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>INGENIERÍA DE SOFTWARE</p>
          <h2 id="developer-contacts-title">Desarrolladores del sistema</h2>
        </div>
        <span className={styles.caption}>Contactos y perfiles</span>
      </div>
      <div className={styles.people}>
        {developers.map(developer => (
          <article className={styles.person} key={developer.github}>
            <div className={styles.identity}>
              <span className={styles.avatar} aria-hidden="true">{developer.name.split(' ').map(part => part[0]).join('')}</span>
              <div><h3>{developer.name}</h3><p>Estudiante de Ingeniería de Software</p></div>
            </div>
            <div className={styles.actions}>
              <a className={styles.github} href={developer.github} target="_blank" rel="noopener noreferrer"><FaGithub aria-hidden="true" /> GitHub</a>
              <a className={styles.whatsapp} href={developer.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`Contactar a ${developer.name} por WhatsApp: ${developer.phone}`}><FaWhatsapp aria-hidden="true" /> WhatsApp <span>{developer.phone}</span></a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
