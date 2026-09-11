-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'profesor',
  telefono VARCHAR(20),
  correo_personal VARCHAR(255),
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
  inventario_id INTEGER REFERENCES inventario(id),
  disponibilidad_id INTEGER,
  cantidad_solicitada INTEGER NOT NULL DEFAULT 1,
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
  sala_nombre VARCHAR(255) NOT NULL DEFAULT 'Sala de Cómputo',
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'solicitudes_disponibilidad_id_fkey'
  ) THEN
    ALTER TABLE solicitudes
      ADD CONSTRAINT solicitudes_disponibilidad_id_fkey
      FOREIGN KEY (disponibilidad_id) REFERENCES disponibilidad(id);
  END IF;
END $$;

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
CREATE INDEX idx_solicitudes_disponibilidad ON solicitudes(disponibilidad_id);
CREATE INDEX idx_disponibilidad_estado ON disponibilidad(estado);
CREATE INDEX idx_inventario_categoria ON inventario(categoria);
CREATE INDEX idx_notificaciones_usuario ON notificaciones_whatsapp(usuario_id);









-- Agregar columna para guardar el correo personal real (referencia/contacto)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correo_personal VARCHAR(255);

-- Import de docentes: login = DNI (como email) / password = DNI
-- El profesor cambia su correo y contraseña reales al entrar por primera vez

INSERT INTO usuarios (email, nombre, apellido, password, role, telefono, dni, area, correo_personal, activo)
VALUES
  ('01311212', 'ROCIO FRINÉ', 'ZANTALLA PRIETO', '01311212', 'profesor', '951635040', '01311212', 'EDUCACIÓN PRIMARIA | 1º GRADO - A', 'chiozp2009@gmail.com', true),
  ('23832444', 'MARIA DEL CARMEN', 'DEL CARPIO DELGADO', '23832444', 'profesor', '957915366', '23832444', 'EDUCACIÓN PRIMARIA | 1º GRADO - B', 'mcdmarilia.01@gmail.com', true),
  ('29427325', 'GRIDEL ROCIO', 'MEDINA CARNERO', '29427325', 'profesor', '959746528', '29427325', 'EDUCACIÓN PRIMARIA | 2º GRADO - A', 'gridelrociomedinacarnero@gmail.com', true),
  ('29571774', 'ELENA AURORA', 'CHOQUE MAMANI', '29571774', 'profesor', '947845822', '29571774', 'EDUCACIÓN PRIMARIA | 2º GRADO - B', 'choqueelena175@gmail.com', true),
  ('02437543', 'VLADIMIR', 'ROJAS ANGLES', '02437543', 'profesor', '958864871', '02437543', 'EDUCACIÓN PRIMARIA | 3º GRADO - A', 'rojasanglesvladimir@gmail.com', true),
  ('09647515', 'PATRICIA FLOR VIRGINIA', 'MERCADO LAZO', '09647515', 'profesor', '992766572', '09647515', 'EDUCACIÓN PRIMARIA | 3º GRADO - B', 'pmercadol@arequipasur.arequipa.edu.pe', true),
  ('24677110', 'MATILDE', 'DEL CASTILLO OBLITAS', '24677110', 'profesor', '959582044', '24677110', 'EDUCACIÓN PRIMARIA | 4º GRADO - A', 'matydc14@gmail.com', true),
  ('29232341', 'SOFIA', 'SOTOMAYOR MACHACA', '29232341', 'profesor', '918808636', '29232341', 'EDUCACIÓN PRIMARIA | 4º GRADO - B', 'sotomayormeza@hotmail.com', true),
  ('29613455', 'CARMEN MARIA', 'MAMANI CHIPANA', '29613455', 'profesor', '958249109', '29613455', 'EDUCACIÓN PRIMARIA | 5º GRADO - A', 'camuchitamch@gmail.com', true),
  ('29619361', 'ROSA ELVIRA', 'SALINAS ZAVALA', '29619361', 'profesor', '987314955', '29619361', 'EDUCACIÓN PRIMARIA | 5º GRADO - B', 'rosa.salinas.zavala@gmail.com', true),
  ('29716960', 'PALMIRA MILAGROS', 'MACEDO VIZCARRA', '29716960', 'profesor', '989598495', '29716960', 'LICENCIADA EN EDUCACIÓN SECUNDARIA - ESPECIALIDAD CIENCIAS | 6º GRADO - A', 'palmi1709@gmail.com', true),
  ('29653788', 'AURORA YESSICA', 'CRUZ POMAR', '29653788', 'profesor', '959397536', '29653788', 'EDUCACIÓN PRIMARIA | 6º GRADO - B', 'acruzpo@gmail.com', true),
  ('44767443', 'DIANA MADELEYNE', 'PACHO ADUVIRE', '44767443', 'profesor', '987102618', '44767443', 'DOCENTE DE EDUCACIÓN FÍSICA | EDUCACION FISICA', 'diana261018@gmail.com', true),
  ('29646213', 'FREDDY ARTURO', 'TORRES CONDORI', '29646213', 'profesor', '951482437', '29646213', 'EDUCACIÓN FÍSICA | EDUCACION FISICA', 'fatcfreddy@gmail.com', true),
  ('01553326', 'EFRAÍN OVIDIO', 'TAPIA CHOQUEHUARA', '01553326', 'profesor', '951975790', '01553326', 'EDUCACIÓN PRIMARIA | PIP', 'efratapia70@gmail.com', true),
  ('41412850', 'KARLA JOSEFINA', 'PAREDES LUQUE', '41412850', 'profesor', '923190048', '41412850', 'EDUCACIÓN CON ESPECIALIDAD IDIOMAS INGLÉS FRANCES | INGLES: 1° A - B INGLES: 2° A - B INGLES: 3° A - B INGLES: 4° A - B INGLES: 5° A - B INGLES: 6° A - B', 'dkarla24@gmail.com', true),
  ('29470251', 'ANTONIA HERCIDA', 'ARAPA TICONA', '29470251', 'profesor', '994515650', '29470251', 'LENGUA Y LITERATURA | COMUNICACION: 5° A - B COORDINADOR DE LETRAS', 'antoniaarapa2018@gmail.com', true),
  ('29368533', 'LUIS GERARDO', 'CARDENAS VARGAS', '29368533', 'profesor', '959021245', '29368533', 'HISTORIA Y GEOGRAFÍA | DPCC: 1° A CIENCIA SOCIALES: 4° A - B CIENCIA SOCIALES: 5° A - B TUTORIA: 5° B', 'luiscardevar63@gmail.com', true),
  ('29372278', 'MERCEDES TRINIDAD', 'GARATE BARCAYO', '29372278', 'profesor', '983036464', '29372278', 'HISTORIA Y GEOGRAFIA | DPCC: 3° A - B DPCC: 4° A - B DPCC: 5° A - B TUTORIA: 3° A', 'mercedesgarate62@gmail.com', true),
  ('29419740', 'LUIS ENRIQUE', 'GUTIERREZ CHOQUE', '29419740', 'profesor', '959965050', '29419740', 'FISICA - QUIMICA | C Y T: 4° A - B COORDINADOR DE CIENCIAS', 'luisenriquegutierrezchoque2@gmail.com', true),
  ('29269767', 'DEICY SIMONEE', 'OSORIO OSTOS', '29269767', 'profesor', '993804874', '29269767', 'CIENCIAS | MATEMATICA: 4° A - B MATEMATICA: 5° A - B TUTORIA: 5° A', 'deicyosorio64@gmail.com', true),
  ('29720332', 'CATALINA ANGÉLICA', 'QUISPE FLORES', '29720332', 'profesor', '993718734', '29720332', 'FÍSICO MATEMÁTICA | MATEMATICA: 3° A - B COORDINADOR DE TUTORIA', 'catalinaqf1968@gmail.com', true),
  ('29265858', 'FLORENTINA JUANA', 'LEÓN CANCHO', '29265858', 'profesor', '924875269', '29265858', 'ELECTRÓNICA | EPT: 2° A - B EPT: 3° A - B EPT: 4° A - B EPT: 5° A - B TUTORIA: 2° A', 'piscispad2@gmail.com', true),
  ('29582956', 'ELIZABETH MARGARITA', 'CANLLAHUA HOLGUIN', '29582956', 'profesor', '990880560', '29582956', 'PROFESORA DE EDUCACIÓN SECUNDARIA INGLÉS FRANCES | INGLES: 3° B INGLES: 4° A - B INGLES: 5° A - B', 'elizacanhol2022@gmail.com', true),
  ('30761560', 'ALEJANDRO CÉSAR', 'MANCHEGO GONZÁLES', '30761560', 'profesor', '951256440', '30761560', 'PROFESOR DE EDUCACIÓN FÍSICA | EDUCACION FISICA: 2° A - B EDUCACION FISICA: 3° A - B EDUCACION FISICA: 4° A - B EDUCACION FISICA: 5° A - B TUTORIA: 2° B', 'cesaralejandro3001@gmail.com', true),
  ('29654052', 'DINA RAQUEL', 'ANDRADE TAPIA', '29654052', 'profesor', '958083246', '29654052', 'PROFESOR DE EDUCACIÓN SECUNDARIA: INGLÉS-FRANCÉS | INGLES: 1° A - B INGLES: 2° A - B INGLES: 3° A', 'keladinita@gmail.com', true),
  ('04745252', 'SILVIA', 'SALAS RAMIREZ', '04745252', 'profesor', '997493070', '04745252', 'ARTES PLASTICAS | ARTE: 1° A - B ARTE: 2° A - B ARTE: 4° A - B ARTE: 5° A - B TUTORIA: 4° A', 'silviasalasramirez2@gmail.com', true),
  ('29704039', 'MARIA NELLY', 'CCAMA LOPEZ', '29704039', 'profesor', '974545220', '29704039', 'RELIGIÓN Y FILOSOFIA | RELIGION: 1° A - B RELIGION: 2° A - B RELIGION: 3° A - B RELIGION: 4° A - B RELIGION: 5° A - B', 'ccamalopezmaria@gmail.com', true),
  ('42182308', 'BETTY VERÓNICA', 'HUANCA QUISPE', '42182308', 'profesor', '974250929', '42182308', 'CIENCIAS SOCIALES FILOSOFÍA Y RELIGIÓN | DPCC: 1° B DPCC: 2° A - B CIENCIA SOCIALES: 3° A - B TUTORIA: 3° B', 'verohuqui502@gmail.com', true),
  ('41465803', 'MARÍA RAFAELA', 'NAYHUA GAMARRA', '41465803', 'profesor', '958137834', '41465803', 'CIENCIAS SOCIALES | CIENCIA SOCIALES: 1° A - B CIENCIA SOCIALES: 2° A - B TUTORIA: 1° B', 'marianayhua@gmail.com', true),
  ('29605996', 'ROSA MARITA', 'SALLUCA IQUISE', '29605996', 'profesor', '918717252', '29605996', 'CIENCIAS SOCIALES | CIENCIA SOCIALES: 1° A - B CIENCIA SOCIALES: 2° A - B TUTORIA: 1° B', 'marita80aqp@gmail.com', true),
  ('46460101', 'ROXANA ELIANA', 'PARÍ CUTIPA', '46460101', 'profesor', '989739111', '46460101', 'LENGUA, LITERATURA, FILOSOFÍA Y PSICOLOGÍA | COMUNICACION: 1° A - B COMUNICACION: 2° A - B', 'rousspcpc@gmail.com', true),
  ('29720355', 'MANUEL', 'QUISPE APAZA', '29720355', 'profesor', '943857670', '29720355', 'MATEMATICA | MATEMATICA: 1° A - B MATEMATICA: 2° A - B', 'manuel2525qa@gmail.com', true),
  ('42295458', 'MARIVEL', 'PACCO HUARACHI', '42295458', 'profesor', '977381664', '42295458', 'MATEMÁTICA | MATEMATICA: 1° A - B MATEMATICA: 2° A - B', 'mary12.mat@gmail.com', true),
  ('29671071', 'YONNY ROLANDO', 'PARRA QUISPE', '29671071', 'profesor', '970975699', '29671071', 'BIOLOGIA Y QUIMICA | C Y T: 3° A - B C Y T: 5° A - B EDUCACION FISICA: 1° A - B', 'yonnyparra43@gmail.com', true),
  ('01311063', 'AUGUSTO', 'CONDORI SALCEDO', '01311063', 'profesor', '937380232', '01311063', 'LENGUAJE Y LITERATURA | COMUNICACION: 3° A - B COMUNICACION: 4° A - B TUTORIA: 4° B', 'augustperu2016@gmail.com', true),
  ('70306588', 'NARDY', 'HUALLPA RODRIGO', '70306588', 'profesor', '926586260', '70306588', 'CIENCIAS NATURALES | C Y T: 1° A - B C Y T: 2° A - B TUTORIA: 1° A', 'anardy.30.10@gmail.com', true),
  ('44084914', 'ROGELIO', 'MORA MUJICA', '44084914', 'profesor', '955082106', '44084914', 'EDUCACIÓN ARTÍSTICA - ARTES PLÁSTICAS | ARTE: 3° A - B EPT: 1° A - B', 'rogemora4408@gmail.com', true),
  ('29205099', 'GUILLERMO MANUEL', 'VALDIVIA ESCAJADILLO', '29205099', 'profesor', '965380059', '29205099', 'EDUCACIÓN SECUNDARIA | AUXILIAR: 1° A - B AUXILIAR: 2° A - B AUXILIAR: 3° A', 'guival145114gm@gmail.com', true),
  ('29593787', 'LILIANA', 'MOLLISACA PARRA', '29593787', 'profesor', '901489396', '29593787', 'EDUCACIÓN INICIAL | AUXILIAR: 3° B AUXILIAR: 4° A - B AUXILIAR: 5° A - B', 'lilianamollisacaparra@gmail.com', true),
  ('40690878', 'BRUNO RENATO', 'BUSTAMANTE CARDENAS', '40690878', 'profesor', '959800903', '40690878', 'PSICOLOGÍA | SECUNDARIA', 'brunorebuscar@gmail.com', true),
  ('72136836', 'JUAN FRANCISCO', 'MARROQUIN ALFARO', '72136836', 'profesor', '930276020', '72136836', 'COMPUTACIÓN E INFORMÁTICA | SECUNDARIA', 'jmarroquinalfaro7@gmail.com', true),
  ('29656105', 'DELCI ROCIO', 'MARTINEZ PALACIOS', '29656105', 'profesor', '977995063', '29656105', 'EDUCACION PRIMARIA | SECUNDARIA', 'delci7023@gmail.com', true),
  ('29250608', 'YOLANDA ESPERANZA', 'REYES DE FERNÁNDEZ', '29250608', 'profesor', '993420041', '29250608', 'SECRETARIADO | PRIMARIA', NULL, true),
  ('29632836', 'FLORENTINO', 'HUAMAN ÁLVAREZ', '29632836', 'profesor', '958852078', '29632836', 'ELECTRICISTA INDUSTRIAL | SECUNDARIA', NULL, true),
  ('29470334', 'SERGIO AGUSTO', 'COAGUILA TITO', '29470334', 'profesor', '959030534', '29470334', 'SECUNDARIA', NULL, true),
  ('29409195', 'MARIANO YON', 'FLORES AMESQUITA', '29409195', 'profesor', '940881961', '29409195', 'DOCENTE DE RELIGION | PRIMARIA', NULL, true),
  ('29574383', 'MARLENY', 'CONCHA LIMA', '29574383', 'profesor', '959654014', '29574383', 'EDUCACIÓN PRIMARIA | PRIMARIA', 'macolim63@gmail.com', true),
  ('29625007', 'RITA GLADYS', 'QUISPE SARMIENTO', '29625007', 'profesor', '940138043', '29625007', 'FISICO-MATEMATICA | SECUNDARIA', 'mifatq@gmail.com', true)
ON CONFLICT (dni) DO UPDATE
  SET email = EXCLUDED.email,
      nombre = EXCLUDED.nombre,
      apellido = EXCLUDED.apellido,
      password = EXCLUDED.password,
      telefono = EXCLUDED.telefono,
      area = EXCLUDED.area,
      correo_personal = EXCLUDED.correo_personal,
      updated_at = CURRENT_TIMESTAMP;