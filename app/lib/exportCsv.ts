/**
 * Exporta datos a formato CSV compatible con Microsoft Excel (con BOM UTF-8 y delimitador estándar).
 */
export function exportToCsv(filename: string, headers: { key: string; label: string }[], rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }

  const escapeCell = (value: any): string => {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  };

  const headerLine = headers.map(h => escapeCell(h.label)).join(';');
  const dataLines = rows.map(row => headers.map(h => escapeCell(row[h.key])).join(';'));
  
  // \uFEFF asegura que Excel en Windows interprete correctamente tildes y eñes
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  if (typeof window === 'undefined') return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.display = 'none';

  if (typeof document !== 'undefined' && document.body) {
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }, 500);
    }
  }
}
