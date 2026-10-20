ALTER TABLE inventario ADD COLUMN IF NOT EXISTS fecha_ingreso DATE;
CREATE INDEX IF NOT EXISTS idx_prestamos_equipo_fecha ON prestamos (inventario_id, fecha_prestamo DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_equipo_fecha ON movimientos_inventario (inventario_id, fecha DESC);
