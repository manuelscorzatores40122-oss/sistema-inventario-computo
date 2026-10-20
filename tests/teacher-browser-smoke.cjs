/* Prueba de interfaz aislada: todas las llamadas API se simulan; no escribe en Neon. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadEnvConfig } = require('@next/env');
const jwt = require('jsonwebtoken');
loadEnvConfig(process.cwd());
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3011';
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const next = new Date(`${today}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 14);
const future = next.toISOString().slice(0, 10);
const user = { id: 9001, nombre: 'Ana', apellido: 'Torres', email: '90019001', dni: '90019001', area: 'Ciencia y Tecnología', telefono: '999888777', correo_personal: 'docente@example.com', role: 'profesor', activo: true };
const data = {
  user,
  inventory: Array.from({ length: 15 }, (_, i) => ({ id: i + 1, nombre: ['Proyector multimedia', 'Laptop para clase', 'Parlante portátil', 'Micrófono inalámbrico'][i % 4] + (i > 3 ? ` ${i}` : ''), descripcion: 'Equipo para uso docente', categoria: i % 2 ? 'Computación' : 'Audiovisuales', cantidad_total: 10, cantidad_disponible: i === 3 ? 0 : 6, estado: 'disponible', imagen_url: null, marca: 'Colegio', modelo: 'Educativo', ubicacion: 'Centro de cómputo', condicion: 'bueno' })),
  requests: [{ id: 101, inventario_id: 1, disponibilidad_id: null, item_nombre: 'Proyector multimedia', cantidad_solicitada: 1, motivo: 'Presentación en clase', estado: 'pendiente', seccion: '3.º B', numero_aula: '204', fecha_solicitud: today, comentarios: null }, { id: 102, inventario_id: 2, disponibilidad_id: null, item_nombre: 'Laptop para clase', cantidad_solicitada: 2, motivo: 'Investigación', estado: 'aprobada', seccion: '4.º A', fecha_solicitud: today, comentarios: 'Puedes recoger el equipo.' }],
  loans: [{ id: 201, solicitud_id: 102, item_nombre: 'Laptop para clase', cantidad: 2, estado: 'pendiente', fecha_prestamo: today, detalle: 'Equipo reservado' }, { id: 202, item_nombre: 'Parlante portátil', cantidad: 1, estado: 'prestado', fecha_prestamo: today, detalle: 'Uso en clase' }],
  schedule: [], template: [{ hora_inicio: '08:00', hora_fin: '08:45' }, { hora_inicio: '08:45', hora_fin: '09:30' }, { hora_inicio: '10:00', hora_fin: '10:45' }],
  notifications: [{ id: 301, mensaje: 'Tu solicitud de laptop fue aprobada. Acércate a recoger el equipo.', tipo: 'solicitud_aprobada', referencia_id: 102, fecha_envio: today }], updatedAt: new Date().toISOString(),
};
async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.TEST_BROWSER_CHANNEL ? { channel: process.env.TEST_BROWSER_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-PE', reducedMotion: 'reduce' });
  const token = jwt.sign({ userId: user.id, role: 'profesor' }, process.env.JWT_SECRET, { expiresIn: '15m' });
  await context.addCookies([{ name: 'auth-token', value: token, url: base, httpOnly: true }]);
  const writes = [];
  await context.route('**/api/**', async route => {
    const request = route.request(); const url = new URL(request.url());
    let body = {};
    if (url.pathname === '/api/profesor/resumen') body = data;
    else if (url.pathname === '/api/notificaciones') body = { notificaciones: data.notifications };
    else if (url.pathname === '/api/notificaciones/lecturas') body = request.method() === 'GET' ? { keys: [] } : { message: 'Lectura guardada' };
    else if (url.pathname === '/api/solicitudes' && request.method() === 'POST') {
      const input = request.postDataJSON(); writes.push(input);
      const row = { ...input, id: 110 + writes.length, estado: 'pendiente', item_nombre: input.tipo_solicitud === 'aula' ? 'Sala de cómputo' : data.inventory.find(i => i.id === input.inventario_id).nombre, fecha_solicitud: today };
      data.requests.unshift(row); body = { solicitud: row };
    } else if (url.pathname.endsWith('/cancelar')) { data.requests.find(row => row.id === 101).estado = 'cancelada'; body = { message: 'Cancelada' }; }
    else if (url.pathname === `/api/usuarios/${user.id}` && request.method() === 'PUT') { Object.assign(user, request.postDataJSON()); body = { usuario: user }; }
    else if (url.pathname === '/api/auth/logout') body = { message: 'Sesión cerrada' };
    else return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: `API no simulada: ${url.pathname}` }) });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  const output = process.env.TEST_SCREENSHOTS || path.join(process.cwd(), 'test-results'); fs.mkdirSync(output, { recursive: true });
  const routes = ['dashboard', 'solicitar-articulo', 'solicitudes', 'horario', 'perfil'];
  for (const width of (process.env.TEST_VIEWPORT_WIDTHS ? process.env.TEST_VIEWPORT_WIDTHS.split(',').map(Number) : [1440, 1366, 1280, 1100, 1024, 992, 991, 820, 768, 390, 360, 320])) {
    await page.setViewportSize({ width, height: width >= 768 ? 600 : 740 });
    for (const route of routes) {
      await page.goto(`${base}/profesor/${route}`); await page.getByRole('heading', { level: 1 }).waitFor({ state: 'attached' });
      await page.getByText('Cargando información…', { exact: true }).waitFor({ state: 'hidden' });
      const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      assert.ok(overflow.scroll <= overflow.client + 1, `Desborde en ${route} a ${width}px: ${JSON.stringify(overflow)}`);
      if ([1440, 390].includes(width)) await page.screenshot({ path: path.join(output, `${route}-${width}.png`), fullPage: true });
      if (width < 992) assert.equal(await page.getByRole('navigation', { name: 'Navegación móvil del docente' }).isVisible(), true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/profesor/solicitar-articulo`);
  await page.getByRole('button', { name: 'Seleccionar Proyector multimedia', exact: true }).click();
  await page.getByLabel('Sección', { exact: true }).fill('3.º B'); await page.getByLabel('Actividad o motivo').fill('Proyección de material de Ciencias');
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click(); await page.getByRole('dialog').waitFor();
  assert.equal(writes.at(-1).inventario_id, 1); assert.equal(writes.at(-1).seccion, '3.º B');
  await page.getByRole('button', { name: 'Cerrar ventana' }).click();
  await page.goto(`${base}/profesor/solicitudes?solicitud=101`); await page.getByRole('dialog').waitFor();
  await page.getByRole('button', { name: 'Cancelar solicitud', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, cancelar' }).click(); await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(data.requests.find(row => row.id === 101).estado, 'cancelada');
  await page.getByRole('tab', { name: /Mis préstamos/ }).click(); await page.getByText('PRÉSTAMO #201', { exact: true }).waitFor();
  await page.goto(`${base}/profesor/horario`); await page.getByRole('button', { name: 'Solicitar reserva' }).click();
  await page.getByRole('dialog').getByRole('heading', { name: /octubre|noviembre|diciembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre/i }).waitFor();
  for (const viewport of [{width:1366,height:768},{width:1280,height:600},{width:1024,height:600},{width:820,height:600},{width:390,height:740},{width:667,height:375}]) {
    await page.setViewportSize(viewport);
    const dialog = page.getByRole('dialog');
    const geometry = await dialog.evaluate(el => ({ width:el.clientWidth, scroll:el.scrollWidth, top:el.getBoundingClientRect().top, bottom:el.getBoundingClientRect().bottom, height:innerHeight }));
    assert.ok(geometry.scroll <= geometry.width + 1, 'Reserva desborda: ' + JSON.stringify({viewport,geometry}));
    assert.ok(geometry.top >= 0 && geometry.bottom <= geometry.height + 1, 'Reserva fuera de pantalla');
    await dialog.getByRole('button', {name:'Enviar solicitud',exact:true}).scrollIntoViewIfNeeded();
    await dialog.getByRole('button', {name:'Cerrar ventana',exact:true}).scrollIntoViewIfNeeded();
    await dialog.evaluate(el => el.scrollTop=0);
    await page.screenshot({path:path.join(output, 'reserva-responsive-' + viewport.width + '.png')});
  }
  await page.setViewportSize({width:390,height:844});
  data.schedule.push({ id: 900, dia_semana: 'Lunes', hora_inicio: '08:00', hora_fin: '08:45', fecha_reserva: future, estado: 'separado', reservado_por: 999, motivo_reserva: 'Clase programada' });
  // La siguiente carga usa una reserva ajena para comprobar exclusión de turnos en el formulario.
  await page.getByRole('button', { name: 'Cerrar ventana' }).click();
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await page.getByRole('button', { name: 'Solicitar reserva' }).click();
  await page.getByLabel('Fecha de la clase').fill(future);
  assert.equal(await page.getByRole('dialog').getByRole('button', { name: /08:00 – 08:45/ }).isDisabled(), true);
  await page.getByRole('dialog').evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: path.join(output, 'reserva-almanaque-390.png'), fullPage: false });
  await page.getByLabel('Actividad y sección').fill('Investigación con 4.º A');
  await page.getByRole('button', { name: 'Necesito otro horario', exact: true }).click();
  await page.getByLabel('Hora de inicio').fill('08:15'); await page.getByLabel('Hora de fin').fill('08:30');
  await page.getByText('Este horario está ocupado. Selecciona otro turno.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Usar un turno de clase', exact: true }).click();
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click(); await page.getByText('Tu turno está en revisión').waitFor();
  assert.equal(writes.at(-1).tipo_solicitud, 'aula'); assert.equal(writes.at(-1).fecha_reserva, future);
  assert.equal(writes.at(-1).hora_inicio, '08:45');
  await page.goto(`${base}/profesor/perfil`); await page.getByLabel('Teléfono de contacto').fill('987654321'); await page.getByRole('button', { name: 'Guardar datos' }).click(); await page.getByText('Tus datos de contacto se actualizaron correctamente.').waitFor();
  assert.equal(user.telefono, '987654321');
  await page.getByRole('button', { name: /Notificaciones/ }).click(); await page.getByText('Tu solicitud de laptop fue aprobada.', { exact: false }).waitFor();
  await page.screenshot({ path: path.join(output, 'notificaciones-profesor-390.png'), fullPage: false });
  await page.getByRole('button', { name: 'Marcar leídas', exact: true }).click();
  await page.getByRole('button', { name: 'Sin leer (0)', exact: true }).click();
  await page.getByText('No tienes avisos sin leer', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cerrar notificaciones', exact: true }).click();
  for (const estado of ['aprobada', 'rechazada']) {
    const mensaje = 'Equipo: Proyector multimedia. Tu mensaje: Presentación en clase. Respuesta de administración: ' + (estado === 'aprobada' ? 'Recoge el equipo en sala.' : 'Equipo reservado para otra clase.');
    data.notifications.unshift({ id: estado === 'aprobada' ? 401 : 402, tipo: 'solicitud_' + estado, referencia_id: 101, mensaje, fecha_envio: new Date().toISOString() });
    data.requests.find(row => row.id === 101).estado = estado;
    await page.getByRole('status').filter({ hasText: mensaje }).waitFor({ timeout: 8000 });
    await page.getByRole('status').getByText('Tu solicitud fue ' + estado, { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cerrar aviso', exact: true }).click();
  }
  assert.deepEqual(errors, []);
  console.log('Interfaz docente: tamaños configurados sin desbordes; solicitud, cancelación, préstamos, reserva, perfil y avisos correctos.');
  await browser.close();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
