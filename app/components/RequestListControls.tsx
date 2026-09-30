'use client';

export default function RequestListControls({ total, visible, onMore, onLess }: {
  total: number;
  visible: number;
  onMore: () => void;
  onLess: () => void;
}) {
  if (total <= 2) return null;
  const remaining = Math.max(0, total - visible);
  return (
    <div className="request-list-controls">
      <span aria-live="polite">Mostrando {Math.min(visible, total)} de {total}</span>
      <div>
        {remaining > 0 && <button type="button" onClick={onMore}>Ver {Math.min(2, remaining)} más</button>}
        {visible > 2 && <button type="button" className="request-list-less" onClick={onLess}>Ver menos</button>}
      </div>
    </div>
  );
}
