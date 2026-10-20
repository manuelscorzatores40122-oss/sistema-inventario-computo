'use client';

import { useEffect, useState } from 'react';
import { FiDownload, FiWifiOff, FiX } from 'react-icons/fi';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PwaSupport() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [ios, setIos] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone;
    setDismissed(!!standalone || sessionStorage.getItem('install-dismissed') === '1');
    setIos(!standalone && /iPad|iPhone|iPod/.test(navigator.userAgent));
    const connection = () => setOffline(!navigator.onLine);
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const installed = () => { setInstall(null); setIos(false); setDismissed(true); };
    connection();
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', installed);
    // Development must never retain an old application shell.
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
    }
    return () => {
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
      window.removeEventListener('beforeinstallprompt', prompt);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  async function installApp() {
    if (!install || installing) return;
    setInstalling(true);
    try {
      await install.prompt();
      await install.userChoice;
      setInstall(null);
    } catch {
      setInstall(null);
    } finally {
      setInstalling(false);
    }
  }

  if (offline) return <aside className="pwa-notice" role="status"><FiWifiOff aria-hidden="true" /><div><strong>Sin conexión</strong><p>Conéctate a internet para consultar datos actualizados y enviar solicitudes. Revisa su estado antes de volver a enviarlas.</p></div></aside>;
  if (dismissed || (!install && !ios)) return null;
  return <aside className="pwa-notice" aria-label="Instalar aplicación">
    <FiDownload aria-hidden="true" />
    <div><strong>Inventario a un toque</strong><p>{ios ? 'En Safari, toca Compartir y luego “Añadir a pantalla de inicio”.' : 'Añade el sistema a tu dispositivo para abrirlo directamente.'}</p>
      {install && <button type="button" onClick={installApp} disabled={installing}>{installing ? 'Abriendo…' : 'Instalar aplicación'}</button>}
    </div>
    <button type="button" className="pwa-dismiss" aria-label="Cerrar aviso de instalación" onClick={() => { sessionStorage.setItem('install-dismissed', '1'); setDismissed(true); }}><FiX /></button>
  </aside>;
}
