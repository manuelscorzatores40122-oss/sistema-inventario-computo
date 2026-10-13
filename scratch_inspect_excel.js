const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'referencia', '1. INVENTARIO TECNOLOGICO EXISTENTE 2024.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('=== HOJAS EN EL LIBRO ===');
console.log(workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  console.log(`\n================== HOJA: "${sheetName}" ==================`);
  const sheet = workbook.Sheets[sheetName];
  
  if (sheet['!ref']) {
    console.log('Rango:', sheet['!ref']);
  }
  
  if (sheet['!merges']) {
    console.log('Celdas combinadas count:', sheet['!merges'].length);
    console.log('Primeras 10 celdas combinadas:');
    sheet['!merges'].slice(0, 10).forEach(m => {
      console.log(`  De R${m.s.r}C${m.s.c} a R${m.e.r}C${m.e.c}`);
    });
  }

  // Convert to array of arrays (rows)
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`Total filas en hoja: ${rows.length}`);
  
  console.log('\nPrimeras 25 filas (para encontrar encabezados y metadatos):');
  rows.slice(0, 25).forEach((row, idx) => {
    // Only display if row has non-empty values
    const nonEmpties = row.map((c, colIdx) => c !== '' ? `[C${colIdx}]: "${c}"` : '').filter(Boolean);
    if (nonEmpties.length > 0) {
      console.log(`Fila ${idx + 1}: ${nonEmpties.join(' | ')}`);
    } else {
      console.log(`Fila ${idx + 1}: <VACÍA>`);
    }
  });

  // Let's also look at rows 26 to 45 to see actual data rows
  console.log('\nFilas 26 a 35 (datos de ejemplo):');
  rows.slice(25, 35).forEach((row, idx) => {
    const nonEmpties = row.map((c, colIdx) => c !== '' ? `[C${colIdx}]: "${c}"` : '').filter(Boolean);
    if (nonEmpties.length > 0) {
      console.log(`Fila ${idx + 26}: ${nonEmpties.join(' | ')}`);
    }
  });
}
