-- Préstamos de equipos a profesores
CREATE TABLE IF NOT EXISTS prestamos (
  id SERIAL PRIMARY KEY,
  inventario_id INTEGER NOT NULL REFERENCES inventario(id),
  profesor_id INTEGER NOT NULL REFERENCES usuarios(id),
  cantidad INTEGER NOT NULL DEFAULT 1,
  detalle VARCHAR(255),
  estado VARCHAR(20) DEFAULT 'prestado',
  fecha_prestamo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_devolucion TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos(estado);
CREATE INDEX IF NOT EXISTS idx_prestamos_inventario ON prestamos(inventario_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_profesor ON prestamos(profesor_id);