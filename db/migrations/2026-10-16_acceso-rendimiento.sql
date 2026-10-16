-- Ejecutar cada sentencia por separado y fuera de una transacción.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_email_lower ON usuarios (LOWER(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disponibilidad_cruces_activos ON disponibilidad (dia_semana, fecha_reserva, hora_inicio, hora_fin) WHERE estado IN ('separado', 'pendiente');
