BEGIN;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS estado_registro VARCHAR(20) CHECK (estado_registro IN ('pendiente', 'aprobada', 'rechazada'));
-- Recupera registros existentes identificados por su aviso de solicitud de cuenta.
UPDATE usuarios u SET estado_registro = CASE WHEN u.activo THEN 'aprobada' ELSE 'pendiente' END
WHERE u.estado_registro IS NULL AND u.role = 'profesor'
  AND EXISTS (SELECT 1 FROM notificaciones_whatsapp n WHERE n.tipo = 'registro_profesor' AND n.referencia_id = u.id);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado_registro ON usuarios (estado_registro, fecha_creacion DESC) WHERE estado_registro IS NOT NULL;
COMMIT;
