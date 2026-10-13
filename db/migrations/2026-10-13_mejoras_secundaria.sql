-- Migración: Mejoras del sistema para Secundaria
-- Fecha: 13 de Octubre de 2026

BEGIN;

-- 1. Campos patrimoniales y estado físico en inventario
ALTER TABLE inventario 
ADD COLUMN IF NOT EXISTS codigo_patrimonial VARCHAR(100),
ADD COLUMN IF NOT EXISTS marca VARCHAR(100),
ADD COLUMN IF NOT EXISTS modelo VARCHAR(100),
ADD COLUMN IF NOT EXISTS condicion VARCHAR(50) DEFAULT 'bueno';

-- 2. Distinción de clases fijas anuales vs reservas puntuales
ALTER TABLE disponibilidad 
ADD COLUMN IF NOT EXISTS es_recurrente BOOLEAN DEFAULT true;

-- 3. Tabla de configuración persistente (plantilla de horario, etc.)
CREATE TABLE IF NOT EXISTS configuracion (
  clave VARCHAR(100) PRIMARY KEY,
  valor TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Observaciones y estados de entrega/devolución en préstamos
ALTER TABLE prestamos
ADD COLUMN IF NOT EXISTS solicitud_id INTEGER REFERENCES solicitudes(id),
ADD COLUMN IF NOT EXISTS devolucion_observacion TEXT,
ADD COLUMN IF NOT EXISTS devolucion_estado VARCHAR(50) DEFAULT 'bueno';

COMMIT;
