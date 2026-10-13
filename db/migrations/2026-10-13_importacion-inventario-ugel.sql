-- Migración: Importación masiva de inventario (formato institucional UGEL)
-- Fecha: 13 de Octubre de 2026
--
-- Segura e idempotente:
--   * Solo ADD COLUMN IF NOT EXISTS, CREATE TABLE/INDEX IF NOT EXISTS y CHECK condicionales.
--   * No borra, no renombra y no modifica datos existentes.
--   * Las filas actuales de inventario quedan con situacion_administrativa = 'activo'
--     y el resto de columnas nuevas en NULL.
--   * No toca solicitudes, préstamos, movimientos ni sus claves foráneas.
--
-- Ejes independientes de un bien después de esta migración:
--   condicion                 -> condición física      : 'bueno' | 'regular' | 'malo'  (ya existía)
--   situacion_administrativa  -> situación del bien    : 'activo' | 'baja' | 'perdido' | 'pendiente_revision'  (nuevo)
--   estado                    -> disponibilidad préstamo: 'disponible' | 'mantenimiento' | 'agotado' | 'no_prestable'
--                                ('no_prestable' es un valor nuevo de uso exclusivo de la importación;
--                                 la columna no tiene CHECK, así que no se altera)

BEGIN;

-- 1. Campos del formato UGEL como columnas independientes
ALTER TABLE inventario
  ADD COLUMN IF NOT EXISTS numero_serie             VARCHAR(150),
  ADD COLUMN IF NOT EXISTS color                    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nivel                    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS observaciones            TEXT,
  ADD COLUMN IF NOT EXISTS procedencia_entidad      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS documento_sustentatorio  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fecha_documento          DATE,
  ADD COLUMN IF NOT EXISTS situacion_administrativa VARCHAR(20) NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS situacion_detalle        VARCHAR(255);  -- texto original de la columna OTRO (ej. "BAJA 2024 - UGEL")

  -- 2. Reglas de integridad
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventario_situacion_administrativa_check') THEN
    ALTER TABLE inventario
      ADD CONSTRAINT inventario_situacion_administrativa_check
      CHECK (situacion_administrativa IN ('activo', 'baja', 'perdido', 'pendiente_revision'));
  END IF;

  -- Bien inactivo nunca puede estar disponible para préstamo
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventario_inactivo_no_prestable_check') THEN
    ALTER TABLE inventario
      ADD CONSTRAINT inventario_inactivo_no_prestable_check
      CHECK (COALESCE(situacion_administrativa, 'pendiente_revision') = 'activo' OR estado IS DISTINCT FROM 'disponible');
  END IF;

  -- Bien en condición MALO nunca puede estar disponible para préstamo
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventario_malo_no_prestable_check') THEN
    ALTER TABLE inventario
      ADD CONSTRAINT inventario_malo_no_prestable_check
      CHECK (COALESCE(condicion, 'bueno') != 'malo' OR estado IS DISTINCT FROM 'disponible');
  END IF;

  -- Bien en estado no_prestable debe tener cantidad_disponible = 0
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventario_no_prestable_stock_check') THEN
    ALTER TABLE inventario
      ADD CONSTRAINT inventario_no_prestable_stock_check
      CHECK (COALESCE(estado, '') != 'no_prestable' OR COALESCE(cantidad_disponible, 0) = 0);
  END IF;
END $$;

-- 3. Historial de importaciones (una fila por archivo procesado)
CREATE TABLE IF NOT EXISTS importaciones_inventario (
  id                SERIAL PRIMARY KEY,
  nombre_archivo    VARCHAR(255) NOT NULL,
  archivo_hash      CHAR(64)     NOT NULL,             -- SHA-256 (hex) del archivo binario
  tamano_bytes      INTEGER      NOT NULL,
  hoja              VARCHAR(100),
  admin_id          INTEGER      NOT NULL REFERENCES usuarios(id),
  total_filas       INTEGER      NOT NULL DEFAULT 0,
  insertados        INTEGER      NOT NULL DEFAULT 0,
  actualizados      INTEGER      NOT NULL DEFAULT 0,
  omitidos          INTEGER      NOT NULL DEFAULT 0,
  rechazados        INTEGER      NOT NULL DEFAULT 0,
  estado            VARCHAR(20)  NOT NULL DEFAULT 'completada'
                    CHECK (estado IN ('completada', 'fallida')),
  mensaje_error     TEXT,
  fecha_importacion TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Resultado por fila del Excel (permite revisar cada carga y detectar contenido
--    equivalente aunque el archivo tenga otro hash)
CREATE TABLE IF NOT EXISTS importaciones_inventario_detalle (
  id              SERIAL PRIMARY KEY,
  importacion_id  INTEGER     NOT NULL REFERENCES importaciones_inventario(id) ON DELETE CASCADE,
  fila_excel      INTEGER     NOT NULL,                 -- número de fila real en la hoja
  numero_ugel     VARCHAR(20),                          -- columna N° tal como venía (no es clave primaria)
  huella_registro CHAR(64),                             -- SHA-256 del contenido normalizado de la fila
  inventario_id   INTEGER     REFERENCES inventario(id) ON DELETE SET NULL,  -- no bloquea borrar artículos
  resultado       VARCHAR(20) NOT NULL
                  CHECK (resultado IN ('insertado', 'actualizado', 'omitido', 'rechazado')),
  mensaje         TEXT,
  datos           JSONB       NOT NULL                  -- valores originales leídos de la fila
);

-- 5. Índices para la detección de duplicados
CREATE INDEX IF NOT EXISTS idx_inventario_numero_serie
  ON inventario (UPPER(numero_serie)) WHERE numero_serie IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventario_situacion
  ON inventario (situacion_administrativa);
CREATE INDEX IF NOT EXISTS idx_importaciones_hash
  ON importaciones_inventario (archivo_hash);
CREATE INDEX IF NOT EXISTS idx_import_detalle_importacion
  ON importaciones_inventario_detalle (importacion_id);
CREATE INDEX IF NOT EXISTS idx_import_detalle_huella
  ON importaciones_inventario_detalle (huella_registro);

COMMIT;

-- ---------------------------------------------------------------------------
-- REVERSIÓN (solo si fuera necesario; elimina el historial de importaciones
-- y los campos UGEL. NO se ejecuta como parte de esta migración):
--
-- BEGIN;
-- DROP TABLE IF EXISTS importaciones_inventario_detalle;
-- DROP TABLE IF EXISTS importaciones_inventario;
-- ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_inactivo_no_prestable_check;
-- ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_situacion_administrativa_check;
-- DROP INDEX IF EXISTS idx_inventario_numero_serie;
-- DROP INDEX IF EXISTS idx_inventario_situacion;
-- ALTER TABLE inventario
--   DROP COLUMN IF EXISTS numero_serie, DROP COLUMN IF EXISTS color, DROP COLUMN IF EXISTS nivel,
--   DROP COLUMN IF EXISTS observaciones, DROP COLUMN IF EXISTS procedencia_entidad,
--   DROP COLUMN IF EXISTS documento_sustentatorio, DROP COLUMN IF EXISTS fecha_documento,
--   DROP COLUMN IF EXISTS situacion_administrativa, DROP COLUMN IF EXISTS situacion_detalle;
-- COMMIT;
