-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'profesor',
  telefono VARCHAR(20),
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de inventario
CREATE TABLE IF NOT EXISTS inventario (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(100) NOT NULL,
  cantidad_total INTEGER NOT NULL,
  cantidad_disponible INTEGER NOT NULL,
  ubicacion VARCHAR(255),
  estado VARCHAR(50) DEFAULT 'disponible',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de solicitudes
CREATE TABLE IF NOT EXISTS solicitudes (
  id SERIAL PRIMARY KEY,
  profesor_id INTEGER NOT NULL REFERENCES usuarios(id),
  inventario_id INTEGER NOT NULL REFERENCES inventario(id),
  cantidad_solicitada INTEGER NOT NULL,
  motivo TEXT,
  estado VARCHAR(50) DEFAULT 'pendiente',
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_aprobacion TIMESTAMP,
  admin_aprueba_id INTEGER REFERENCES usuarios(id),
  comentarios TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de disponibilidad
CREATE TABLE IF NOT EXISTS disponibilidad (
  id SERIAL PRIMARY KEY,
  profesor_id INTEGER NOT NULL REFERENCES usuarios(id),
  dia_semana VARCHAR(20) NOT NULL,
  hora_inicio VARCHAR(10) NOT NULL,
  hora_fin VARCHAR(10) NOT NULL,
  estado VARCHAR(50) DEFAULT 'disponible',
  reservado_por INTEGER REFERENCES usuarios(id),
  motivo_reserva VARCHAR(255),
  fecha_reserva TIMESTAMP,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de movimientos de inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id SERIAL PRIMARY KEY,
  inventario_id INTEGER NOT NULL REFERENCES inventario(id),
  tipo_movimiento VARCHAR(50) NOT NULL,
  cantidad INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  descripcion TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de notificaciones WhatsApp
CREATE TABLE IF NOT EXISTS notificaciones_whatsapp (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  numero_telefono VARCHAR(20) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(50),
  referencia_id INTEGER,
  estado VARCHAR(50) DEFAULT 'pendiente',
  fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_entrega TIMESTAMP
);

-- Índices
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_role ON usuarios(role);
CREATE INDEX idx_solicitudes_profesor ON solicitudes(profesor_id);
CREATE INDEX idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX idx_disponibilidad_profesor ON disponibilidad(profesor_id);
CREATE INDEX idx_inventario_categoria ON inventario(categoria);
