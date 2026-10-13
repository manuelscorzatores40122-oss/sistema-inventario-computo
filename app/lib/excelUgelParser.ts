import * as XLSX from 'xlsx';
import crypto from 'crypto';

export type UgelRowParsed = {
  fila_excel: number;
  numero_ugel: string;
  cantidad: number | null;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  serie_es_valida: boolean;
  color: string | null;
  nivel: string | null;
  ubicacion: string | null;
  condicion: 'bueno' | 'regular' | 'malo';
  situacion_administrativa: 'activo' | 'baja' | 'perdido' | 'pendiente_revision';
  situacion_detalle: string | null;
  observaciones: string | null;
  procedencia_entidad: string | null;
  documento_sustentatorio: string | null;
  fecha_documento: string | null;
  categoria: string;
  estado_propuesto: 'no_prestable' | 'disponible' | 'mantenimiento';
  cantidad_disponible_propuesta: number;
  es_lote: boolean;
  huella_registro: string;
  // Estado de validación
  valido: boolean;
  advertencias: string[];
  errores: string[];
  es_duplicado_interno?: boolean;
  es_duplicado_bd?: boolean;
  duplicado_con_id?: number;
  duplicado_razon?: string;
};

export type UgelParseResult = {
  nombre_archivo: string;
  archivo_hash: string;
  tamano_bytes: number;
  hoja: string;
  filas_leidas: number;
  total_validas: number;
  total_advertencias: number;
  total_errores: number;
  total_bajas: number;
  total_duplicados: number;
  filas: UgelRowParsed[];
};

const SERIES_GENERICAS = new Set([
  'NO TIENE',
  'NOTIENE',
  'S/N',
  'SN',
  'SIN SERIE',
  'SINSERIE',
  'N/A',
  'NA',
  'NINGUNO',
  '-',
  '--',
  '---',
]);

export function normalizarTexto(val: unknown): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

export function limpiarSerie(val: unknown): { serie: string | null; esValida: boolean } {
  const raw = normalizarTexto(val);
  if (!raw) return { serie: null, esValida: false };
  const upper = raw.toUpperCase().replace(/\s+/g, ' ');
  if (SERIES_GENERICAS.has(upper) || upper.length < 3) {
    return { serie: null, esValida: false };
  }
  return { serie: raw, esValida: true };
}

export function inferirCategoria(desc: string): string {
  const d = desc.toUpperCase();
  if (d.includes('CPU') || d.includes('MONITOR') || d.includes('LAPTOP') || d.includes('TECLADO') || d.includes('MOUSE') || d.includes('COMPUTADORA')) {
    return 'Cómputo';
  }
  if (d.includes('TELEVISOR') || d.includes('DVD') || d.includes('PARLANTE') || d.includes('MICROFONO') || d.includes('CAÑON') || d.includes('PROYECTOR') || d.includes('AUDIO')) {
    return 'Audio y Video';
  }
  if (d.includes('SWITCH') || d.includes('ROUTER') || d.includes('WIFI') || d.includes('CAMARA') || d.includes('CONSOLA') || d.includes('RED') || d.includes('DVR')) {
    return 'Redes y Seguridad';
  }
  if (d.includes('IMPRESORA') || d.includes('FOTOCOPIADORA') || d.includes('SCANNER') || d.includes('ESCANER')) {
    return 'Impresión';
  }
  if (d.includes('ESTABILIZADOR') || d.includes('UPS') || d.includes('TRANSFORMADOR')) {
    return 'Energía';
  }
  return 'Equipos y Accesorios';
}

export function parseUgelExcel(buffer: Buffer, nombreArchivo: string): UgelParseResult {
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('inventario')) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error('El archivo no contiene ninguna hoja válida de inventario.');
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rawRows.length < 12) {
    throw new Error('El archivo tiene muy pocas filas y no cumple con el formato institucional de la UGEL.');
  }

  // Detectar la fila de encabezado
  let headerRowIdx = -1;
  let colNum = 0;
  let colCant = 1;
  let colDesc = 2;
  let colMarca = 3;
  let colModelo = 4;
  let colObs = 5;
  let colSerie = 6;
  let colColor = 7;
  let colNivel = 8;
  let colUbicacion = 9;
  let colEstado = 10;
  let colOtro = 11;
  let colProc = 12;
  let colDoc = 13;
  let colFecha = 14;

  for (let i = 0; i < Math.min(25, rawRows.length); i++) {
    const rowStr = rawRows[i].map(c => String(c).toUpperCase()).join(' ');
    if ((rowStr.includes('CANT') || rowStr.includes('CANT.')) && (rowStr.includes('DESCRIPCION') || rowStr.includes('BIEN'))) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    // Si no se encuentra exactamente, usar los índices predeterminados de la UGEL (fila 11/12)
    headerRowIdx = 10;
  }

  // Fila donde inician los datos: usualmente 2 filas después del encabezado principal
  const dataStartRow = headerRowIdx + 2; // fila 13 o 14 (base 0)

  const parsedList: UgelRowParsed[] = [];
  const seriesVistas = new Map<string, number>(); // serieNormalizada -> index en parsedList

  for (let r = dataStartRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rawNum = normalizarTexto(row[colNum]);
    const rawDesc = normalizarTexto(row[colDesc]);

    // Detección de fin de tabla o fila de observaciones final
    if (rawDesc.toUpperCase().includes('IMPORTANTE') && rawDesc.toUpperCase().includes('OBSERVACIONES')) {
      break;
    }

    // Si tanto el número como la descripción están vacíos, omitir fila
    if (!rawNum && !rawDesc) {
      continue;
    }

    const filaExcel = r + 1;
    const advertencias: string[] = [];
    const errores: string[] = [];

    // Cantidad
    const rawCant = row[colCant];
    let cantidad: number | null = null;
    if (rawCant === '' || rawCant === null || rawCant === undefined) {
      errores.push('Cantidad vacía o no especificada. No se permite inferir automáticamente.');
    } else {
      const numCant = Number(rawCant);
      if (!Number.isInteger(numCant) || numCant <= 0) {
        errores.push(`Cantidad inválida ("${rawCant}"). Debe ser un número entero mayor a cero.`);
      } else {
        cantidad = numCant;
      }
    }

    // Descripción / Nombre
    if (!rawDesc) {
      errores.push('Descripción del bien vacía.');
    }

    const rawMarca = normalizarTexto(row[colMarca]);
    const marca = (rawMarca && !SERIES_GENERICAS.has(rawMarca.toUpperCase())) ? rawMarca : null;

    const rawModelo = normalizarTexto(row[colModelo]);
    const modelo = (rawModelo && !SERIES_GENERICAS.has(rawModelo.toUpperCase())) ? rawModelo : null;

    const { serie, esValida: serieEsValida } = limpiarSerie(row[colSerie]);

    const rawColor = normalizarTexto(row[colColor]);
    const color = rawColor || null;

    const rawNivel = normalizarTexto(row[colNivel]);
    const nivel = rawNivel || null;

    const rawUbi = normalizarTexto(row[colUbicacion]);
    const ubicacion = rawUbi || null;

    // Condición física (ESTADO)
    const rawEstado = normalizarTexto(row[colEstado]).toUpperCase();
    let condicion: 'bueno' | 'regular' | 'malo' = 'bueno';
    if (rawEstado.includes('MALO') || rawEstado.includes('MALA')) {
      condicion = 'malo';
    } else if (rawEstado.includes('REGULAR')) {
      condicion = 'regular';
    } else if (rawEstado.includes('BUENO') || rawEstado.includes('BUENA')) {
      condicion = 'bueno';
    } else if (rawEstado) {
      advertencias.push(`Estado físico no estándar ("${rawEstado}"). Se asignó 'bueno' para revisión.`);
      condicion = 'bueno';
    }

    // Situación administrativa (OTRO)
    const rawOtro = normalizarTexto(row[colOtro]);
    const otroUpper = rawOtro.toUpperCase();
    let situacionAdmin: 'activo' | 'baja' | 'perdido' | 'pendiente_revision' = 'activo';

    if (otroUpper.includes('BAJA') && (otroUpper.includes('PERDIDA') || otroUpper.includes('PÉRDIDA') || otroUpper.includes('ROBO'))) {
      situacionAdmin = 'perdido';
    } else if (otroUpper.includes('BAJA')) {
      situacionAdmin = 'baja';
    } else if (otroUpper.includes('SE QUEDA') || otroUpper.includes('ALTA')) {
      situacionAdmin = 'activo';
    } else if (!otroUpper) {
      // Si la columna OTRO está vacía, se asume activo si está en bueno/regular
      situacionAdmin = condicion === 'malo' ? 'baja' : 'activo';
    } else {
      situacionAdmin = 'pendiente_revision';
      advertencias.push(`Situación administrativa no clasificada ("${rawOtro}"). Marcado como pendiente de revisión.`);
    }

    const rawObs = normalizarTexto(row[colObs]);
    const observaciones = rawObs || null;

    const rawProc = normalizarTexto(row[colProc]);
    const procedencia_entidad = rawProc || null;

    const rawDoc = normalizarTexto(row[colDoc]);
    const documento_sustentatorio = rawDoc || null;

    // Fecha del documento
    let fecha_documento: string | null = null;
    const rawFecha = row[colFecha];
    if (rawFecha) {
      if (rawFecha instanceof Date && !isNaN(rawFecha.getTime())) {
        fecha_documento = rawFecha.toISOString().split('T')[0];
      } else {
        const strFecha = String(rawFecha).trim();
        const m = strFecha.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (m) {
          const dia = m[1].padStart(2, '0');
          const mes = m[2].padStart(2, '0');
          fecha_documento = `${m[3]}-${mes}-${dia}`;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(strFecha)) {
          fecha_documento = strFecha;
        }
      }
    }

    // Regla de operatividad: si es baja, perdido, pendiente o malo -> NUNCA DISPONIBLE
    let estadoPropuesto: 'no_prestable' | 'disponible' | 'mantenimiento' = 'no_prestable';
    let cantDispPropuesta = 0;

    if (situacionAdmin === 'baja' || situacionAdmin === 'perdido') {
      estadoPropuesto = 'no_prestable';
      cantDispPropuesta = 0;
      advertencias.push(`Equipo en situación de ${situacionAdmin.toUpperCase()}. No es prestable.`);
    } else if (condicion === 'malo') {
      estadoPropuesto = 'mantenimiento';
      cantDispPropuesta = 0;
      advertencias.push('Equipo en condición física MALO. Bloqueado para préstamo (mantenimiento requerido).');
    } else if (situacionAdmin === 'pendiente_revision') {
      estadoPropuesto = 'no_prestable';
      cantDispPropuesta = 0;
      advertencias.push('Situación administrativa pendiente de revisión. Bloqueado para préstamo.');
    } else {
      // Activo y en buen/regular estado: se propone como no_prestable por defecto
      // (el admin puede decidir activarlo como disponible en la vista previa)
      estadoPropuesto = 'no_prestable';
      cantDispPropuesta = 0;
    }

    const categoria = inferirCategoria(rawDesc);
    const esLote = (cantidad !== null && cantidad > 1 && !serieEsValida);

    if (cantidad !== null && cantidad > 1 && serieEsValida) {
      advertencias.push(`Fila con cantidad ${cantidad} y un solo número de serie. Se registrará como lote con nota.`);
    }

    // Huella única de la fila
    const fingerprintRaw = `${rawDesc}|${marca || ''}|${modelo || ''}|${serie || ''}|${ubicacion || ''}|${condicion}|${situacionAdmin}|${rawOtro}`;
    const huella_registro = crypto.createHash('sha256').update(fingerprintRaw.toUpperCase()).digest('hex');

    // Detección de duplicado interno en el mismo archivo (por serie confiable)
    let esDuplicadoInterno = false;
    if (serieEsValida && serie) {
      const serieKey = serie.toUpperCase();
      if (seriesVistas.has(serieKey)) {
        const filaAnterior = seriesVistas.get(serieKey)!;
        esDuplicadoInterno = true;
        advertencias.push(`Número de serie repetido dentro del mismo archivo (ya apareció en la fila ${filaAnterior}).`);
      } else {
        seriesVistas.set(serieKey, filaExcel);
      }
    }

    const esValido = errores.length === 0;

    parsedList.push({
      fila_excel: filaExcel,
      numero_ugel: rawNum,
      cantidad,
      nombre: rawDesc,
      marca,
      modelo,
      numero_serie: serie,
      serie_es_valida: serieEsValida,
      color,
      nivel,
      ubicacion,
      condicion,
      situacion_administrativa: situacionAdmin,
      situacion_detalle: rawOtro || null,
      observaciones,
      procedencia_entidad,
      documento_sustentatorio,
      fecha_documento,
      categoria,
      estado_propuesto: estadoPropuesto,
      cantidad_disponible_propuesta: cantDispPropuesta,
      es_lote: esLote,
      huella_registro,
      valido: esValido,
      advertencias,
      errores,
      es_duplicado_interno: esDuplicadoInterno,
    });
  }

  const totalValidas = parsedList.filter(f => f.valido && f.errores.length === 0).length;
  const totalAdvertencias = parsedList.filter(f => f.advertencias.length > 0).length;
  const totalErrores = parsedList.filter(f => f.errores.length > 0).length;
  const totalBajas = parsedList.filter(f => f.situacion_administrativa === 'baja' || f.situacion_administrativa === 'perdido').length;
  const totalDuplicados = parsedList.filter(f => f.es_duplicado_interno).length;

  return {
    nombre_archivo: nombreArchivo,
    archivo_hash: sha256,
    tamano_bytes: buffer.length,
    hoja: sheetName,
    filas_leidas: parsedList.length,
    total_validas: totalValidas,
    total_advertencias: totalAdvertencias,
    total_errores: totalErrores,
    total_bajas: totalBajas,
    total_duplicados: totalDuplicados,
    filas: parsedList,
  };
}
