'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FiUploadCloud,
  FiFileText,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiShield,
  FiClock,
  FiLayers,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiInfo,
  FiX,
  FiCheck,
  FiSearch,
  FiArrowRight,
  FiList,
  FiDatabase,
  FiEye,
  FiTag,
  FiClipboard,
  FiSettings,
  FiCopy,
} from 'react-icons/fi';
import type { UgelRowParsed } from '@/app/lib/excelUgelParser';
import { exportToCsv } from '@/app/lib/exportCsv';
import styles from './ExcelImportModal.module.css';

interface ImportSummary {
  nombre_archivo: string;
  archivo_hash: string;
  tamano_bytes: number;
  hoja: string;
  filas_leidas: number;
  total_validas: number;
  total_advertencias: number;
  total_errores: number;
  total_bajas: number;
  total_duplicados_internos: number;
  total_duplicados_bd: number;
  archivo_ya_importado: boolean;
  importacion_previa?: {
    id: number;
    nombre_archivo: string;
    fecha_importacion: string;
    insertados: number;
  } | null;
}

interface ImportHistorialItem {
  id: number;
  nombre_archivo: string;
  tamano_bytes: number;
  total_filas: number;
  insertados: number;
  omitidos: number;
  rechazados: number;
  estado: string;
  fecha_importacion: string;
  admin_nombre?: string;
  admin_apellido?: string;
}

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/* =========================================================================
   SUBCOMPONENTE: MODAL DE DETALLE INSTITUCIONAL (15 CAMPOS OFICIALES UGEL)
   ========================================================================= */
function UgelItemDetailModal({
  item,
  onClose,
}: {
  item: UgelRowParsed | null;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <div
      className={`${styles.detailOverlay} notranslate`}
      translate="no"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ugel-detail-title"
    >
      <div
        className={`${styles.detailCard} notranslate`}
        translate="no"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Sobria e Institucional con Insignia del Colegio */}
        <div className={styles.detailCardHeader}>
          <div className={styles.detailHeaderLeft}>
            <img
              src="/logo.png"
              alt="Insignia Institucional del Colegio"
              className={styles.schoolLogoImg}
            />
            <div>
              <h3 id="ugel-detail-title" className={styles.detailCardTitle}>
                Detalle del bien UGEL
              </h3>
              <span className={styles.detailCardSubtitle}>
                Vista completa del registro antes de importar
              </span>
            </div>
          </div>
          <button
            type="button"
            className={styles.detailCloseBtn}
            onClick={onClose}
            title="Cerrar ventana de detalles"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Contenido principal en 2 tarjetas idénticas al diseño solicitado */}
        <div className={styles.detailCardBody}>
          {/* TARJETA 1: Información del registro (15 campos del Excel) */}
          <div className={styles.blueCard}>
            <div className={styles.blueCardHeader}>
              <FiFileText size={16} />
              <span>Información del registro (15 campos del Excel)</span>
            </div>
            <table className={styles.table15}>
              <thead>
                <tr>
                  <th className={styles.tableCampoCol}><span>Campo</span></th>
                  <th className={styles.tableValorCol}><span>Valor</span></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.tableCampoCol}><span>N° UGEL</span></td>
                  <td className={styles.tableValorCol}>
                    <span>{String(item.numero_ugel ?? 'No especificado')}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Cantidad</span></td>
                  <td className={styles.tableValorCol}>
                    <span>{item.cantidad !== null && item.cantidad !== undefined ? String(item.cantidad) : 'No especificado'}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Descripción del bien</span></td>
                  <td className={styles.tableValorCol}>
                    <span>{String(item.nombre || 'No especificado')}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Marca</span></td>
                  <td className={styles.tableValorCol}>
                    <span>{String(item.marca || 'No especificado')}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Modelo</span></td>
                  <td className={styles.tableValorCol}>
                    <span>{String(item.modelo || 'No especificado')}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Observaciones</span></td>
                  <td className={styles.tableValorCol}>
                    <span>{String(item.observaciones || 'No especificado')}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Número de serie</span></td>
                  <td className={styles.tableValorCol}>
                    <span>{String(item.numero_serie || 'No especificado')}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Color</span></td>
                  <td className={styles.tableValorCol}>
                    <span>{String(item.color || 'No especificado')}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Nivel</span></td>
                  <td className={styles.tableValorCol}>
                    <span>{String(item.nivel || 'No especificado')}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Ubicación del bien</span></td>
                  <td className={styles.tableValorCol}>
                    <span>{String(item.ubicacion || 'No especificado')}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Estado físico</span></td>
                  <td className={styles.tableValorCol}>
                    <span>
                      {item.condicion === 'bueno'
                        ? 'Bueno'
                        : item.condicion === 'regular'
                          ? 'Regular'
                          : 'Malo'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Otro / Situación administrativa</span></td>
                  <td className={styles.tableValorCol}>
                    <span>
                      {item.situacion_detalle ||
                        (item.situacion_administrativa === 'activo'
                          ? 'SE QUEDA 2024'
                          : item.situacion_administrativa === 'baja'
                            ? 'BAJA'
                            : item.situacion_administrativa === 'perdido'
                              ? 'PERDIDO'
                              : 'PENDIENTE DE REVISIÓN')}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Entidad o dependencia</span></td>
                  <td className={styles.tableValorCol}>
                    <span>{String(item.procedencia_entidad || 'No especificado')}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Documento sustentatorio</span></td>
                  <td className={styles.tableValorCol}>
                    <span>{String(item.documento_sustentatorio || 'No especificado')}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.tableCampoCol}><span>Fecha del documento</span></td>
                  <td className={styles.tableValorCol}>
                    <span>{String(item.fecha_documento || 'No especificado')}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TARJETA 2: Diagnóstico del sistema */}
          <div className={styles.greenCard}>
            <div className={styles.greenCardHeader}>
              <FiSettings size={16} />
              <span>Diagnóstico del sistema</span>
            </div>
            <table className={styles.diagTable}>
              <tbody>
                <tr>
                  <td className={styles.diagLabelCol}><span>Categoría inferida</span></td>
                  <td className={styles.diagIconCol}>
                    <FiTag size={16} />
                  </td>
                  <td className={styles.diagBadgeCol}>
                    <span className={styles.pillBlue}>{item.categoria || 'Audio y Video'}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.diagLabelCol}><span>Estado propuesto en el sistema</span></td>
                  <td className={styles.diagIconCol}>
                    <FiShield size={16} />
                  </td>
                  <td className={styles.diagBadgeCol}>
                    <span className={styles.pillGray}>
                      {item.estado_propuesto === 'no_prestable'
                        ? 'No prestable'
                        : item.estado_propuesto === 'mantenimiento'
                          ? 'Mantenimiento'
                          : 'Disponible'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.diagLabelCol}><span>Es lote</span></td>
                  <td className={styles.diagIconCol}>
                    <FiLayers size={16} />
                  </td>
                  <td className={styles.diagBadgeCol}>
                    <span className={styles.pillGray}>{item.es_lote ? 'Sí' : 'No'}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.diagLabelCol}><span>Duplicado</span></td>
                  <td className={styles.diagIconCol}>
                    <FiCopy size={16} />
                  </td>
                  <td className={styles.diagBadgeCol}>
                    {item.es_duplicado_interno || item.es_duplicado_bd ? (
                      <span className={styles.pillRed}>Sí</span>
                    ) : (
                      <span className={styles.pillGray}>No</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className={styles.diagLabelCol}><span>Dictamen</span></td>
                  <td className={styles.diagIconCol}>
                    {item.valido && item.errores.length === 0 ? (
                      <FiCheckCircle size={17} style={{ color: '#16a34a' }} />
                    ) : (
                      <FiXCircle size={17} style={{ color: '#dc2626' }} />
                    )}
                  </td>
                  <td className={styles.diagBadgeCol}>
                    {item.valido && item.errores.length === 0 ? (
                      <span className={styles.pillGreen}>Válido para importación</span>
                    ) : (
                      <span className={styles.pillRed}>
                        {item.errores.length > 0 ? `Rechazado: ${item.errores[0]}` : 'Rechazado'}
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie con botón Cerrar alineado a la derecha */}
        <div className={styles.detailFooter}>
          <button
            type="button"
            className={styles.cerrarBtn}
            onClick={onClose}
          >
            <FiX size={15} /> Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   COMPONENTE PRINCIPAL: ASISTENTE DE IMPORTACIÓN MASIVA UGEL
   ========================================================================= */
export default function ExcelImportModal({ isOpen, onClose, onSuccess }: ExcelImportModalProps) {
  // Pestaña principal: 'importar' | 'historial'
  const [tab, setTab] = useState<'importar' | 'historial'>('importar');

  // Pasos del asistente: 1: Subir, 2: Vista previa, 3: Resultados
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Estados de subida y análisis
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Datos analizados
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [rows, setRows] = useState<UgelRowParsed[]>([]);

  // Fila seleccionada para inspección de 15 campos
  const [selectedRowDetail, setSelectedRowDetail] = useState<UgelRowParsed | null>(null);

  // Opciones de importación
  const [omitirDuplicados, setOmitirDuplicados] = useState(true);
  const [forzarReimportacion, setForzarReimportacion] = useState(false);

  // Filtros de la tabla de vista previa
  const [previewFilter, setPreviewFilter] = useState<'todos' | 'validos' | 'bajas' | 'advertencias' | 'errores'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 30;

  // Estados de confirmación y ejecución
  const [confirming, setConfirming] = useState(false);
  const [importResult, setImportResult] = useState<{
    importacion_id: number;
    insertados: number;
    omitidos: number;
    rechazados: number;
    mensaje: string;
  } | null>(null);

  // Historial
  const [historial, setHistorial] = useState<ImportHistorialItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && tab === 'historial') {
      fetchHistorial();
    }
  }, [isOpen, tab]);

  const fetchHistorial = async () => {
    setLoadingHistorial(true);
    try {
      const res = await fetch('/api/inventario/importar/historial');
      if (res.ok) {
        const data = await res.json();
        setHistorial(data.historial || []);
      }
    } catch (err) {
      console.error('Error al cargar historial:', err);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const resetImportFlow = () => {
    setStep(1);
    setFile(null);
    setSummary(null);
    setRows([]);
    setErrorMessage(null);
    setImportResult(null);
    setSelectedRowDetail(null);
    setForzarReimportacion(false);
    setPage(1);
    setSearchTerm('');
    setPreviewFilter('todos');
  };

  const handleModalClose = () => {
    resetImportFlow();
    onClose();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectedFile = (selectedFile: File) => {
    const ext = selectedFile.name.toLowerCase();
    if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
      setErrorMessage('Por favor selecciona un archivo con extensión .xlsx o .xls');
      return;
    }
    setFile(selectedFile);
    setErrorMessage(null);
    analyzeFile(selectedFile);
  };

  const analyzeFile = async (fileToAnalyze: File) => {
    setAnalyzing(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', fileToAnalyze);

    try {
      const res = await fetch('/api/inventario/importar/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo procesar el archivo Excel.');
      }

      setSummary(data.resumen);
      setRows(data.filas || []);
      setStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al analizar el archivo Excel.');
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (previewFilter === 'validos') {
        if (!r.valido || r.errores.length > 0) return false;
      } else if (previewFilter === 'bajas') {
        if (
          r.situacion_administrativa !== 'baja' &&
          r.situacion_administrativa !== 'perdido' &&
          r.condicion !== 'malo'
        )
          return false;
      } else if (previewFilter === 'advertencias') {
        if (r.advertencias.length === 0 && !r.es_duplicado_interno && !r.es_duplicado_bd) return false;
      } else if (previewFilter === 'errores') {
        if (r.valido && r.errores.length === 0) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = r.nombre.toLowerCase().includes(q);
        const matchesSerie = r.numero_serie?.toLowerCase().includes(q);
        const matchesUgel = r.numero_ugel?.toLowerCase().includes(q);
        const matchesMarca = r.marca?.toLowerCase().includes(q);
        if (!matchesName && !matchesSerie && !matchesUgel && !matchesMarca) {
          return false;
        }
      }

      return true;
    });
  }, [rows, previewFilter, searchTerm]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  // Ejecución transaccional enviando el archivo binario original como fuente de verdad
  const executeImport = async () => {
    if (!summary || !file) return;
    setConfirming(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('omitir_duplicados', omitirDuplicados ? 'true' : 'false');
      formData.append('forzar_reimportacion', forzarReimportacion ? 'true' : 'false');

      const res = await fetch('/api/inventario/importar/confirmar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al registrar los artículos.');
      }

      setImportResult({
        importacion_id: data.importacion_id,
        insertados: data.insertados,
        omitidos: data.omitidos,
        rechazados: data.rechazados,
        mensaje: data.mensaje,
      });

      setStep(3);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error en la importación transaccional.');
    } finally {
      setConfirming(false);
    }
  };

  const handleExportIncidencias = () => {
    const headers = [
      { key: 'fila', label: 'Fila Excel' },
      { key: 'numero_ugel', label: 'N° UGEL' },
      { key: 'nombre', label: 'Descripción' },
      { key: 'marca', label: 'Marca' },
      { key: 'modelo', label: 'Modelo' },
      { key: 'numero_serie', label: 'N° Serie' },
      { key: 'condicion', label: 'Condición Física' },
      { key: 'situacion', label: 'Situación Administrativa' },
      { key: 'cantidad', label: 'Cantidad' },
      { key: 'estado_propuesto', label: 'Estado Propuesto' },
      { key: 'valido', label: 'Es Válido' },
      { key: 'duplicado', label: 'Duplicado Serie' },
      { key: 'alertas', label: 'Alertas / Errores' },
    ];

    const exportData = rows.map((r) => ({
      fila: r.fila_excel,
      numero_ugel: r.numero_ugel || '',
      nombre: r.nombre,
      marca: r.marca || '',
      modelo: r.modelo || '',
      numero_serie: r.numero_serie || '',
      condicion: r.condicion.toUpperCase(),
      situacion: r.situacion_administrativa.toUpperCase(),
      cantidad: r.cantidad || 0,
      estado_propuesto: r.estado_propuesto,
      valido: r.valido ? 'SÍ' : 'NO',
      duplicado: r.es_duplicado_interno ? 'Interno' : r.es_duplicado_bd ? 'En BD' : 'No',
      alertas: [...r.errores, ...r.advertencias].join(' | '),
    }));

    exportToCsv('reporte_diagnostico_ugel', headers, exportData);
  };

  if (!isOpen) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        zIndex: 1050,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div className={styles.modalContainer}>
        {/* Cabecera Institucional */}
        <div className={styles.modalHeader}>
          <div className="d-flex align-items-center gap-2">
            <FiFileText size={18} className="text-primary" />
            <div>
              <h2 className={styles.modalHeaderTitle}>
                Importación Masiva de Inventario UGEL
                <span className="badge bg-light text-secondary border text-xs fw-semibold px-2">
                  Formato Institucional
                </span>
              </h2>
              <span className={styles.modalHeaderSubtitle}>
                Carga técnica de planillas de inventario escolar con validación de series y trazabilidad.
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <div className="btn-group btn-group-sm me-2" role="group">
              <button
                type="button"
                className={`btn btn-sm ${tab === 'importar' ? 'btn-primary' : 'btn-outline-secondary'
                  } text-xs fw-semibold`}
                onClick={() => setTab('importar')}
              >
                <FiUploadCloud size={13} className="me-1" /> Asistente de Carga
              </button>
              <button
                type="button"
                className={`btn btn-sm ${tab === 'historial' ? 'btn-primary' : 'btn-outline-secondary'
                  } text-xs fw-semibold`}
                onClick={() => setTab('historial')}
              >
                <FiList size={13} className="me-1" /> Historial de Cargas
              </button>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-light border p-1 text-secondary"
              onClick={handleModalClose}
              title="Cerrar asistente"
              style={{ width: '30px', height: '30px', borderRadius: '4px' }}
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-3 flex-grow-1 overflow-auto bg-slate-50 d-flex flex-column">
          {tab === 'historial' ? (
            /* TAB HISTORIAL */
            <div className="d-flex flex-column flex-grow-1">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div>
                  <h3 className="h6 fw-bold mb-0 text-dark">Registro de Importaciones Anteriores</h3>
                  <small className="text-muted">Historial transaccional con auditoría por archivo y usuario.</small>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 text-xs"
                  onClick={fetchHistorial}
                  disabled={loadingHistorial}
                >
                  <FiRefreshCw size={12} className={loadingHistorial ? 'animate-spin' : ''} />
                  Actualizar
                </button>
              </div>

              {loadingHistorial ? (
                <div className="text-center py-5 text-secondary">
                  <div className="spinner-border text-primary spinner-border-sm mb-2" role="status" />
                  <p className="small mb-0">Cargando historial de importaciones...</p>
                </div>
              ) : historial.length === 0 ? (
                <div className="text-center py-5 bg-white rounded-2 border">
                  <FiDatabase size={32} className="text-muted mb-2" />
                  <h4 className="h6 fw-semibold text-secondary">No hay importaciones registradas</h4>
                  <p className="small text-muted mb-0">Aún no se ha realizado ninguna carga masiva en el sistema.</p>
                </div>
              ) : (
                <div className="table-responsive bg-white rounded-2 border shadow-sm flex-grow-1">
                  <table className="table table-hover align-middle mb-0 text-xs" style={{ fontSize: '0.82rem' }}>
                    <thead className="table-light text-secondary">
                      <tr>
                        <th>ID</th>
                        <th>Archivo</th>
                        <th>Fecha de Carga</th>
                        <th>Administrador</th>
                        <th className="text-center">Total Filas</th>
                        <th className="text-center">Insertados</th>
                        <th className="text-center">Omitidos</th>
                        <th className="text-center">Rechazados</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((item) => (
                        <tr key={item.id}>
                          <td className="fw-bold text-secondary">#{item.id}</td>
                          <td>
                            <div className="d-flex align-items-center gap-1.5">
                              <FiFileText className="text-primary flex-shrink-0" size={14} />
                              <span className="fw-semibold text-dark">{item.nombre_archivo}</span>
                              <span className="badge bg-light text-muted border text-xs">
                                {(item.tamano_bytes / 1024).toFixed(0)} KB
                              </span>
                            </div>
                          </td>
                          <td className="text-muted">
                            {new Date(item.fecha_importacion).toLocaleString('es-PE', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="text-secondary">
                            {item.admin_nombre ? `${item.admin_nombre} ${item.admin_apellido || ''}` : 'Administrador'}
                          </td>
                          <td className="text-center fw-bold">{item.total_filas}</td>
                          <td className="text-center text-success fw-bold">+{item.insertados}</td>
                          <td className="text-center text-warning fw-bold">{item.omitidos}</td>
                          <td className="text-center text-danger fw-bold">{item.rechazados}</td>
                          <td>
                            <span
                              className={`badge rounded-1 text-xs px-2 py-0.5 ${item.estado === 'completada' || item.estado === 'completado'
                                ? 'bg-success bg-opacity-10 text-success border border-success-subtle'
                                : 'bg-danger bg-opacity-10 text-danger border border-danger-subtle'
                                }`}
                            >
                              {item.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* TAB ASISTENTE DE IMPORTACIÓN */
            <div className="d-flex flex-column flex-grow-1">
              {/* Stepper Superior */}
              <div className="d-flex align-items-center justify-content-between mb-3 px-2">
                {[
                  { num: 1, label: '1. Seleccionar archivo' },
                  { num: 2, label: '2. Validación y vista previa' },
                  { num: 3, label: '3. Resultado final' },
                ].map((s, idx) => (
                  <React.Fragment key={s.num}>
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className={`d-flex align-items-center justify-content-center fw-bold text-xs ${step === s.num
                          ? 'bg-primary text-white shadow-sm'
                          : step > s.num
                            ? 'bg-success text-white'
                            : 'bg-light text-muted border'
                          }`}
                        style={{ width: '24px', height: '24px', borderRadius: '4px' }}
                      >
                        {step > s.num ? <FiCheck size={13} /> : s.num}
                      </div>
                      <span
                        className={`small fw-semibold text-xs ${step === s.num ? 'text-primary' : step > s.num ? 'text-dark' : 'text-muted'
                          }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {idx < 2 && (
                      <div
                        className="flex-grow-1 mx-2"
                        style={{
                          height: '1px',
                          backgroundColor: step > idx + 1 ? '#10b981' : '#cbd5e1',
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Mensajes de error globales */}
              {errorMessage && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-2 mb-2 text-xs">
                  <FiAlertTriangle className="flex-shrink-0" size={15} />
                  <span className="flex-grow-1">{errorMessage}</span>
                  <button
                    type="button"
                    className="btn-close btn-close-sm"
                    onClick={() => setErrorMessage(null)}
                  />
                </div>
              )}

              {/* PASO 1: SUBIR ARCHIVO */}
              {step === 1 && (
                <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 py-4">
                  <div
                    className={`p-4 rounded-3 text-center transition-all w-100 ${dragActive ? 'bg-primary bg-opacity-10 border-primary' : 'bg-white border'
                      }`}
                    style={{
                      maxWidth: '620px',
                      cursor: 'pointer',
                      borderStyle: 'dashed',
                      borderWidth: '2px',
                      borderColor: dragActive ? '#2563eb' : '#cbd5e1',
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls"
                      className="d-none"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleSelectedFile(e.target.files[0]);
                        }
                      }}
                    />

                    {analyzing ? (
                      <div className="py-4">
                        <div className="spinner-border text-primary mb-2" style={{ width: '2.5rem', height: '2.5rem' }} role="status" />
                        <h3 className="h6 fw-bold text-dark mb-1">Analizando estructura institucional UGEL...</h3>
                        <p className="text-secondary small mb-0">
                          Detectando encabezados, validando cantidades, números de serie y coherencia de datos.
                        </p>
                      </div>
                    ) : (
                      <div className="py-2">
                        <div
                          className="d-inline-flex align-items-center justify-content-center bg-slate-100 text-primary mb-2"
                          style={{ width: '52px', height: '52px', borderRadius: '6px' }}
                        >
                          <FiUploadCloud size={28} />
                        </div>
                        <h3 className="h6 fw-bold text-dark mb-1">
                          Arrastra y suelta tu archivo Excel aquí
                        </h3>
                        <p className="text-secondary small mb-3">
                          o haz clic para explorar en tu computadora (.xlsx o .xls, máx. 20 MB)
                        </p>
                        <button type="button" className="btn btn-outline-primary btn-sm px-3 fw-semibold text-xs rounded-1">
                          Examinar archivos
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 p-3 bg-white rounded-2 border text-secondary small" style={{ maxWidth: '620px', fontSize: '0.8rem' }}>
                    <div className="d-flex align-items-center gap-1.5 mb-1 fw-bold text-dark">
                      <FiInfo className="text-primary" size={15} /> Criterios del formato oficial UGEL:
                    </div>
                    <ul className="mb-0 ps-3 text-muted">
                      <li>El archivo debe contener las 15 columnas oficiales: <strong>N°, CANT, DESCRIPCIÓN, MARCA, MODELO, SERIE, ESTADO, OTRO...</strong></li>
                      <li>Las series genéricas (<em>NO TIENE, S/N, N/A</em>) se convierten a vacías para evitar colisiones.</li>
                      <li>Los equipos en estado <strong>MALO</strong> o de <strong>BAJA / PÉRDIDA</strong> ingresan como <strong>No prestables</strong>.</li>
                      <li>Las cantidades vacías o 0 se rechazan para revisión manual.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* PASO 2: VISTA PREVIA Y VALIDACIÓN */}
              {step === 2 && summary && (
                <div className="d-flex flex-column flex-grow-1 overflow-hidden">
                  {/* Banner si el archivo ya fue importado */}
                  {summary.archivo_ya_importado && (
                    <div className="alert alert-warning py-1.5 px-3 rounded-2 mb-2 d-flex align-items-center justify-content-between text-xs">
                      <div className="d-flex align-items-center gap-2">
                        <FiAlertTriangle className="text-warning flex-shrink-0" size={15} />
                        <span>
                          <strong>Atención:</strong> Este archivo ya fue importado anteriormente (ID #{summary.importacion_previa?.id} con {summary.importacion_previa?.insertados} registros).
                        </span>
                      </div>
                      <label className="form-check-label text-xs fw-bold text-dark d-flex align-items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={forzarReimportacion}
                          onChange={(e) => setForzarReimportacion(e.target.checked)}
                        />
                        Forzar reimportación
                      </label>
                    </div>
                  )}

                  {/* Tarjetas de Resumen KPI Sobrias */}
                  <div className="row g-2 mb-2">
                    <div className="col-4 col-md-2">
                      <div className="bg-white p-2 rounded-2 border shadow-sm text-center">
                        <span className="text-muted d-block text-xs">Total leídos</span>
                        <strong className="h6 fw-bold text-dark mb-0">{summary.filas_leidas}</strong>
                      </div>
                    </div>
                    <div className="col-4 col-md-2">
                      <div className="bg-white p-2 rounded-2 border shadow-sm text-center">
                        <span className="text-muted d-block text-xs">Válidos</span>
                        <strong className="h6 fw-bold text-success mb-0">{summary.total_validas}</strong>
                      </div>
                    </div>
                    <div className="col-4 col-md-2">
                      <div className="bg-white p-2 rounded-2 border shadow-sm text-center">
                        <span className="text-muted d-block text-xs">Bajas / No prestables</span>
                        <strong className="h6 fw-bold text-secondary mb-0">{summary.total_bajas}</strong>
                      </div>
                    </div>
                    <div className="col-4 col-md-2">
                      <div className="bg-white p-2 rounded-2 border shadow-sm text-center">
                        <span className="text-muted d-block text-xs">Duplicados BD</span>
                        <strong className="h6 fw-bold text-warning mb-0">{summary.total_duplicados_bd}</strong>
                      </div>
                    </div>
                    <div className="col-4 col-md-2">
                      <div className="bg-white p-2 rounded-2 border shadow-sm text-center">
                        <span className="text-muted d-block text-xs">Duplicados Internos</span>
                        <strong className="h6 fw-bold text-warning mb-0">{summary.total_duplicados_internos}</strong>
                      </div>
                    </div>
                    <div className="col-4 col-md-2">
                      <div className="bg-white p-2 rounded-2 border shadow-sm text-center">
                        <span className="text-muted d-block text-xs">Errores bloqueantes</span>
                        <strong className="h6 fw-bold text-danger mb-0">{summary.total_errores}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Filtros y Búsqueda */}
                  <div className="bg-white p-2 rounded-2 border mb-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-1 flex-wrap">
                      {[
                        { id: 'todos', label: 'Todos', count: rows.length },
                        { id: 'validos', label: 'Válidos', count: summary.total_validas },
                        { id: 'bajas', label: 'Bajas / No prestable', count: summary.total_bajas },
                        {
                          id: 'advertencias',
                          label: 'Alertas / Duplicados',
                          count: rows.filter(
                            (r) => r.advertencias.length > 0 || r.es_duplicado_bd || r.es_duplicado_interno
                          ).length,
                        },
                        { id: 'errores', label: 'Errores', count: summary.total_errores },
                      ].map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          className={`btn btn-sm text-xs fw-semibold px-2 py-0.5 rounded-1 ${previewFilter === chip.id
                            ? 'btn-primary text-white'
                            : 'btn-light border text-secondary'
                            }`}
                          onClick={() => {
                            setPreviewFilter(chip.id as any);
                            setPage(1);
                          }}
                        >
                          {chip.label}{' '}
                          <span
                            className={`badge text-xs ms-1 ${previewFilter === chip.id ? 'bg-white text-dark' : 'bg-secondary bg-opacity-20 text-dark'
                              }`}
                          >
                            {chip.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <div className="position-relative" style={{ width: '200px' }}>
                        <FiSearch className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" size={13} />
                        <input
                          type="text"
                          className="form-control form-control-sm ps-4 text-xs"
                          placeholder="Buscar en vista previa..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 text-xs"
                        onClick={handleExportIncidencias}
                        title="Descargar tabla completa con diagnósticos en CSV"
                      >
                        <FiDownload size={13} /> Exportar Diagnóstico
                      </button>
                    </div>
                  </div>

                  {/* Tabla de Vista Previa Compacta y Ordenada */}
                  <div className="table-responsive bg-white rounded-2 border flex-grow-1 shadow-sm overflow-auto" style={{ maxHeight: '340px' }}>
                    <table className="table table-sm table-hover align-middle mb-0 text-xs" style={{ fontSize: '0.8rem' }}>
                      <thead className="table-light text-secondary sticky-top border-bottom">
                        <tr>
                          <th style={{ width: '45px' }}>Fila</th>
                          <th style={{ width: '55px' }}>N° UGEL</th>
                          <th>Descripción del Bien</th>
                          <th>N° Serie</th>
                          <th>Marca / Modelo</th>
                          <th>Condición</th>
                          <th>Situación Adm.</th>
                          <th className="text-center">Cant.</th>
                          <th>Estado Propuesto</th>
                          <th>Diagnóstico</th>
                          <th style={{ width: '105px', textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="text-center py-4 text-muted">
                              No hay registros que coincidan con el filtro seleccionado.
                            </td>
                          </tr>
                        ) : (
                          paginatedRows.map((r) => {
                            const hasError = !r.valido || r.errores.length > 0;
                            const isDup = r.es_duplicado_interno || r.es_duplicado_bd;

                            return (
                              <tr
                                key={r.fila_excel}
                                className={hasError ? 'table-danger' : isDup ? 'table-warning' : ''}
                              >
                                <td className="text-muted fw-semibold">#{r.fila_excel}</td>
                                <td className="text-muted">{r.numero_ugel || '—'}</td>
                                <td>
                                  <strong className="text-dark d-block">{r.nombre}</strong>
                                  <span className="text-muted text-xs">Categoría: {r.categoria}</span>
                                </td>
                                <td>
                                  {r.numero_serie ? (
                                    <span className="badge bg-light text-dark border font-monospace">
                                      {r.numero_serie}
                                    </span>
                                  ) : (
                                    <span className="text-muted fst-italic">Sin serie (Genérico)</span>
                                  )}
                                </td>
                                <td>
                                  {[r.marca, r.modelo].filter(Boolean).join(' / ') || '—'}
                                </td>
                                <td>
                                  <span
                                    className={`badge rounded-1 text-xs px-2 py-0.5 ${r.condicion === 'malo'
                                      ? 'bg-danger text-white'
                                      : r.condicion === 'regular'
                                        ? 'bg-warning text-dark'
                                        : 'bg-success text-white'
                                      }`}
                                  >
                                    {r.condicion.toUpperCase()}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`badge rounded-1 text-xs px-2 py-0.5 ${r.situacion_administrativa === 'baja' || r.situacion_administrativa === 'perdido'
                                      ? 'bg-secondary text-white'
                                      : r.situacion_administrativa === 'pendiente_revision'
                                        ? 'bg-warning text-dark'
                                        : 'bg-primary bg-opacity-10 text-primary border border-primary-subtle'
                                      }`}
                                  >
                                    {r.situacion_administrativa.toUpperCase()}
                                  </span>
                                </td>
                                <td className="text-center fw-bold">
                                  {r.cantidad !== null ? (
                                    <>
                                      {r.cantidad}
                                      {r.es_lote && (
                                        <span className="badge bg-info text-dark ms-1 text-xs" title="Lote agrupado">
                                          LOTE
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-danger fw-bold">INVÁLIDO</span>
                                  )}
                                </td>
                                <td>
                                  <span
                                    className="status-badge"
                                    style={{
                                      backgroundColor: '#f1f5f9',
                                      color: '#475569',
                                      border: '1px solid #cbd5e1',
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      fontSize: '0.73rem',
                                    }}
                                  >
                                    <FiShield size={11} className="me-1" />
                                    {r.estado_propuesto === 'no_prestable'
                                      ? 'No prestable'
                                      : r.estado_propuesto === 'mantenimiento'
                                        ? 'Mantenimiento'
                                        : 'Disponible'}
                                  </span>
                                </td>
                                <td>
                                  {r.errores.map((e, i) => (
                                    <div key={i} className="text-danger fw-semibold d-flex align-items-center gap-1 text-xs">
                                      <FiXCircle size={12} /> {e}
                                    </div>
                                  ))}
                                  {r.advertencias.map((a, i) => (
                                    <div key={i} className="text-warning-emphasis d-flex align-items-center gap-1 text-xs">
                                      <FiAlertTriangle size={12} /> {a}
                                    </div>
                                  ))}
                                  {r.valido && r.errores.length === 0 && r.advertencias.length === 0 && (
                                    <span className="text-success d-flex align-items-center gap-1 text-xs">
                                      <FiCheckCircle size={12} /> Válido
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  <button
                                    type="button"
                                    className={styles.actionBtn}
                                    onClick={() => setSelectedRowDetail(r)}
                                    title="Ver los 15 campos institucionales del Excel"
                                  >
                                    <FiEye size={12} />
                                    Ver detalles
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  <div className="d-flex align-items-center justify-content-between pt-1.5 px-1 text-xs">
                    <span className="text-muted">
                      Mostrando {filteredRows.length ? (page - 1) * pageSize + 1 : 0} a{' '}
                      {Math.min(page * pageSize, filteredRows.length)} de {filteredRows.length} filas
                    </span>

                    <div className="d-flex align-items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-light border px-2 py-0.5 rounded-1"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Anterior
                      </button>
                      <span className="px-2 fw-semibold text-secondary">
                        Página {page} de {totalPages}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-light border px-2 py-0.5 rounded-1"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>

                  {/* Barra de Confirmación Inferior */}
                  <div className="pt-2.5 border-top mt-2 d-flex align-items-center justify-content-between bg-white px-3 py-2 rounded-2 border">
                    <div className="d-flex align-items-center gap-3">
                      <label className="form-check-label text-xs fw-semibold text-dark d-flex align-items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={omitirDuplicados}
                          onChange={(e) => setOmitirDuplicados(e.target.checked)}
                        />
                        Omitir automáticamente duplicados de número de serie en base de datos
                      </label>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-light border text-secondary px-3 rounded-1 text-xs"
                        onClick={resetImportFlow}
                        disabled={confirming}
                      >
                        Cambiar archivo
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary fw-bold px-3 d-flex align-items-center gap-2 rounded-1 text-xs"
                        onClick={executeImport}
                        disabled={confirming || summary.total_validas === 0}
                      >
                        {confirming ? (
                          <>
                            <div className="spinner-border spinner-border-sm text-white" role="status" />
                            Aplicando transacción segura...
                          </>
                        ) : (
                          <>
                            <FiCheck size={14} /> Confirmar e Importar ({summary.total_validas} bienes)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 3: RESULTADOS DE IMPORTACIÓN */}
              {step === 3 && importResult && (
                <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 py-4 text-center">
                  <div
                    className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success mb-2"
                    style={{ width: '56px', height: '56px', borderRadius: '6px' }}
                  >
                    <FiCheckCircle size={32} />
                  </div>

                  <h3 className="h6 fw-bold text-dark mb-1">Importación Masiva Completada Exitosamente</h3>
                  <p className="text-secondary small mb-3" style={{ maxWidth: '520px', fontSize: '0.82rem' }}>
                    Transacción confirmada en PostgreSQL Neon. Los bienes registrados cuentan con su auditoría en movimientos de inventario y detalle de carga.
                  </p>

                  <div className="row g-2 mb-3" style={{ maxWidth: '500px', width: '100%' }}>
                    <div className="col-4">
                      <div className="p-2.5 bg-white border rounded-2 shadow-sm">
                        <span className="text-muted d-block text-xs">Insertados</span>
                        <strong className="h5 fw-bold text-success mb-0">+{importResult.insertados}</strong>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2.5 bg-white border rounded-2 shadow-sm">
                        <span className="text-muted d-block text-xs">Omitidos</span>
                        <strong className="h5 fw-bold text-warning mb-0">{importResult.omitidos}</strong>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-2.5 bg-white border rounded-2 shadow-sm">
                        <span className="text-muted d-block text-xs">Rechazados</span>
                        <strong className="h5 fw-bold text-danger mb-0">{importResult.rechazados}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm px-3 d-flex align-items-center gap-1 rounded-1 text-xs"
                      onClick={handleExportIncidencias}
                    >
                      <FiDownload size={13} /> Descargar Reporte (CSV)
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm px-3 fw-bold rounded-1 text-xs"
                      onClick={handleModalClose}
                    >
                      Finalizar y Ver Inventario
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE DETALLE INSTITUCIONAL (15 CAMPOS COMPLETOS UGEL) */}
      <UgelItemDetailModal
        item={selectedRowDetail}
        onClose={() => setSelectedRowDetail(null)}
      />
    </div>
  );
}
