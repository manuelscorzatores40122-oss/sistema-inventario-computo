// Análisis en memoria del Excel de referencia (no escribe en ninguna base de datos)
const XLSX = require('xlsx');
const wb = XLSX.readFile('referencia/1. INVENTARIO TECNOLOGICO EXISTENTE 2024.xlsx');
const ws = wb.Sheets['formato de inventarios'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
const norm = s => String(s).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s\-_./]/g, '');
const generic = new Set(['NOTIENE', 'SN', 'SINSERIE', 'NA', '']);

const multi = [], series = new Map(), cantVals = new Map(), condCombos = new Map();
for (let i = 13; i < 856; i++) {
  const r = rows[i];
  if (r[0] === '' && r[2] === '') continue;
  const cant = r[1];
  cantVals.set(String(cant), (cantVals.get(String(cant)) || 0) + 1);
  if (Number(cant) > 1) multi.push({ fila: i + 1, n: r[0], cant, desc: r[2], serie: String(r[6]).replace(/\r?\n/g, ' | ') });
  const k = norm(r[6]);
  if (!generic.has(k)) {
    if (!series.has(k)) series.set(k, []);
    series.get(k).push(i + 1);
  }
  const combo = `${r[10]} / ${r[11]}`;
  condCombos.set(combo, (condCombos.get(combo) || 0) + 1);
}
console.log('Valores de CANT.:', Object.fromEntries(cantVals));
console.log('Filas con CANT > 1:', multi.length);
console.table(multi.slice(0, 40));
const dups = [...series.entries()].filter(([, v]) => v.length > 1);
console.log('Series confiables repetidas dentro del Excel:', dups.length);
console.table(dups.slice(0, 20).map(([k, v]) => ({ serie: k, filas: v.join(', ') })));
const cortas = [...series.keys()].filter(k => k.length < 5);
console.log('Series muy cortas:', cortas);
console.log('Combinaciones ESTADO / OTRO:');
console.table([...condCombos.entries()].map(([k, n]) => ({ combo: k, n })));
// Tipos de celda reales de la columna SERIE (G)
const tipos = {};
for (let r = 13; r < 856; r++) {
  const c = ws[XLSX.utils.encode_cell({ r, c: 6 })];
  if (!c) continue;
  tipos[c.t] = (tipos[c.t] || 0) + 1;
  if (c.t === 'n' && (tipos.ej || []).length < 5) (tipos.ej = tipos.ej || []).push({ fila: r + 1, v: c.v, w: c.w });
}
console.log('Tipos de celda en SERIE:', JSON.stringify(tipos));
