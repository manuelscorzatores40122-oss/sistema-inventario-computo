BEGIN;
CREATE TABLE IF NOT EXISTS notificaciones_lecturas (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  notification_key VARCHAR(80) NOT NULL,
  leida_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, notification_key)
);
COMMIT;
