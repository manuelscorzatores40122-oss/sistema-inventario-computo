BEGIN;
SET LOCAL lock_timeout = '5s';
-- Older installations used this column for a return approval workflow.
-- Preserve those historic values while accepting the physical condition
-- recorded by the current administrator return form.
ALTER TABLE prestamos DROP CONSTRAINT IF EXISTS prestamos_devolucion_estado_check;
ALTER TABLE prestamos ADD CONSTRAINT prestamos_devolucion_estado_check
  CHECK (devolucion_estado IN ('bueno', 'regular', 'malo', 'pendiente', 'aprobada', 'rechazada'));
COMMIT;
