-- Script de datos de prueba
-- Ejecutar después de schema.sql

-- Usuarios de prueba
-- Contraseña: admin123 (hasheada con bcryptjs)
INSERT INTO usuarios (email, nombre, apellido, password, role, telefono, activo) 
VALUES 
('admin@colegio.com', 'Admin', 'Sistema', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/GOi', 'admin', '+51987654321', true),
('profesor1@colegio.com', 'Juan', 'Pérez', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/GOi', 'profesor', '+51987654322', true),
('profesor2@colegio.com', 'María', 'García', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/GOi', 'profesor', '+51987654323', true),
('profesor3@colegio.com', 'Carlos', 'López', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/GOi', 'profesor', '+51987654324', true);

-- Items de inventario
INSERT INTO inventario (nombre, descripcion, categoria, cantidad_total, cantidad_disponible, ubicacion, estado)
VALUES 
('Proyector', 'Proyector Epson EB-X39', 'Equipos Electrónicos', 5, 3, 'Sala 101', 'disponible'),
('Cable HDMI', 'Cable HDMI 2.0 metros', 'Cables', 20, 18, 'Almacén', 'disponible'),
('Pizarra Inteligente', 'Pizarra interactiva Samsung', 'Equipos Electrónicos', 3, 2, 'Salas de clase', 'disponible'),
('Control TV', 'Control remoto universal', 'Accesorios', 10, 7, 'Almacén', 'disponible'),
('Cable de Poder', 'Cable de alimentación 220V', 'Cables', 50, 45, 'Almacén', 'disponible'),
('Laptop', 'Laptop HP 15 pulgadas', 'Equipos Cómputo', 8, 5, 'Laboratorio', 'disponible'),
('Mouse Inalámbrico', 'Mouse Logitech', 'Accesorios', 15, 12, 'Almacén', 'disponible'),
('Teclado', 'Teclado mecánico', 'Accesorios', 10, 8, 'Almacén', 'disponible'),
('Monitor', 'Monitor LG 24 pulgadas', 'Equipos Cómputo', 12, 10, 'Laboratorio', 'disponible'),
('Router WiFi', 'TP-Link AC1200', 'Equipos Red', 4, 2, 'Almacén', 'disponible');

-- Disponibilidades de profesores
INSERT INTO disponibilidad (profesor_id, dia_semana, hora_inicio, hora_fin, estado)
VALUES 
(2, 'Lunes', '08:00', '12:00', 'disponible'),
(2, 'Martes', '08:00', '12:00', 'disponible'),
(2, 'Miércoles', '14:00', '18:00', 'disponible'),
(2, 'Jueves', '08:00', '12:00', 'disponible'),
(2, 'Viernes', '14:00', '18:00', 'disponible'),
(3, 'Lunes', '14:00', '18:00', 'disponible'),
(3, 'Martes', '14:00', '18:00', 'disponible'),
(3, 'Miércoles', '08:00', '12:00', 'disponible'),
(3, 'Jueves', '14:00', '18:00', 'disponible'),
(3, 'Viernes', '08:00', '12:00', 'disponible'),
(4, 'Lunes', '08:00', '12:00', 'disponible'),
(4, 'Martes', '08:00', '12:00', 'disponible'),
(4, 'Miércoles', '08:00', '12:00', 'disponible'),
(4, 'Jueves', '14:00', '18:00', 'disponible'),
(4, 'Viernes', '14:00', '18:00', 'disponible');

-- Solicitud de ejemplo
INSERT INTO solicitudes (profesor_id, inventario_id, cantidad_solicitada, motivo, estado)
VALUES 
(2, 1, 1, 'Clase de Presentación de Proyecto', 'pendiente'),
(3, 2, 2, 'Reparación de equipos', 'pendiente');

-- Movimientos de inventario (historial)
INSERT INTO movimientos_inventario (inventario_id, tipo_movimiento, cantidad, usuario_id, descripcion)
VALUES 
(1, 'entrada', 5, 1, 'Compra inicial de proyectores'),
(2, 'entrada', 20, 1, 'Compra de cables HDMI'),
(3, 'entrada', 3, 1, 'Compra de pizarras inteligentes'),
(1, 'salida', 2, 2, 'Solicitud aprobada Juan Pérez'),
(2, 'salida', 2, 3, 'Solicitud aprobada María García');

-- Notificaciones de ejemplo (historial)
INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, estado)
VALUES 
(2, '+51987654322', 'Tu solicitud de 1 Proyector ha sido APROBADA', 'solicitud_aprobada', 'entregada'),
(3, '+51987654323', 'Tu solicitud de 2 Cables HDMI está PENDIENTE de aprobación', 'solicitud_pendiente', 'entregada');

-- Cambiar disponibilidad de un profesor (ocupado/separado)
-- UPDATE disponibilidad SET estado = 'separado', reservado_por = 1, motivo_reserva = 'Ocupado en reunión' 
-- WHERE profesor_id = 2 AND dia_semana = 'Lunes';
