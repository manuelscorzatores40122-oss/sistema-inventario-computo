ALTER TABLE disponibilidad
  ADD COLUMN IF NOT EXISTS sala_nombre VARCHAR(255) NOT NULL DEFAULT 'Sala de Cómputo';

ALTER TABLE solicitudes
  ADD COLUMN IF NOT EXISTS disponibilidad_id INTEGER REFERENCES disponibilidad(id);

ALTER TABLE solicitudes
  ALTER COLUMN inventario_id DROP NOT NULL,
  ALTER COLUMN cantidad_solicitada SET DEFAULT 1;

ALTER TABLE disponibilidad
  ALTER COLUMN profesor_id DROP NOT NULL;

UPDATE disponibilidad
SET sala_nombre = 'Sala de Cómputo'
WHERE sala_nombre IS NULL OR sala_nombre = '';

CREATE INDEX IF NOT EXISTS idx_solicitudes_disponibilidad ON solicitudes(disponibilidad_id);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_estado ON disponibilidad(estado);
