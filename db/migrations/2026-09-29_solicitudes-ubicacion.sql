-- Las solicitudes anteriores conservan NULL: no se inventa su ubicación.
BEGIN;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS seccion VARCHAR(60);
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS numero_aula VARCHAR(30);
COMMIT;
