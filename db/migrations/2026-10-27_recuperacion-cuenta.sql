BEGIN;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS codigo_recuperacion_hash VARCHAR(64);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

-- Límites compartidos entre las instancias, sin almacenar DNI en claro.
CREATE TABLE IF NOT EXISTS intentos_recuperacion (
  clave VARCHAR(80) PRIMARY KEY,
  intentos INTEGER NOT NULL DEFAULT 1,
  inicio TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
