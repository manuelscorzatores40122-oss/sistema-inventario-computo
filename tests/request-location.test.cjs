const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function route() {
  const calls = [];
  const exported = {};
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT id, nombre')) return { rows: [{ id: 1, nombre: 'Proyector', cantidad_disponible: 5 }] };
      if (sql.startsWith('INSERT INTO disponibilidad')) return { rows: [{ id: 20 }] };
      if (sql.startsWith('INSERT INTO solicitudes')) return { rows: [{ id: 10, seccion: params[5], numero_aula: params[6] }] };
      return { rows: [] };
    },
    release() {},
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(resolve(__dirname, '../app/api/solicitudes/route.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports: exported, console, URL,
    require(name) {
      if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
      if (name === '@/app/lib/admin-notifications') {
        const helper = {};
        vm.runInNewContext(ts.transpileModule(readFileSync(resolve(__dirname, '../app/lib/admin-notifications.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: helper });
        return helper;
      }
      if (name === '@/app/lib/db') return { getClient: async () => client };
      throw new Error(name);
    },
  });
  return { post: data => exported.POST({ json: async () => ({ profesor_id: 1, inventario_id: 1, cantidad_solicitada: 1, tipo_solicitud: 'equipo', ...data }) }), calls };
}

test('rechaza ubicación vacía, tipos incorrectos y textos demasiado largos antes de escribir', async () => {
  for (const data of [{}, { seccion: '  ', numero_aula: '' }, { seccion: 12 }, { numero_aula: {} }, { seccion: 'a'.repeat(61) }, { numero_aula: '1'.repeat(31) }]) {
    const { post, calls } = route();
    assert.equal((await post(data)).status, 400);
    assert.equal(calls.length, 0);
  }
});

test('guarda sección o aula, limpia espacios y conserva NULL en el campo no completado', async () => {
  for (const [data, section, room] of [[{ seccion: ' 2.º B ' }, '2.º B', null], [{ numero_aula: ' 201 ' }, null, '201'], [{ seccion: 'A', numero_aula: '12' }, 'A', '12']]) {
    const { post, calls } = route();
    const response = await post(data);
    assert.equal(response.status, 200);
    assert.equal(response.body.solicitud.seccion, section);
    assert.equal(response.body.solicitud.numero_aula, room);
    assert.ok(calls.some(call => call.sql === 'COMMIT'));
  }
});


test('reserva el aula sin ubicación y descarta la sección de un formulario anterior', async () => {
  const future = new Date();
  future.setUTCDate(future.getUTCDate() + 7);
  for (const location of [{}, { seccion: '2.º B', numero_aula: '201' }]) {
    const { post, calls } = route();
    const response = await post({
      tipo_solicitud: 'aula', inventario_id: null,
      fecha_reserva: future.toISOString().slice(0, 10), hora_inicio: '08:00', hora_fin: '10:00',
      ...location,
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.solicitud.seccion, null);
    assert.equal(response.body.solicitud.numero_aula, null);
    assert.ok(calls.some(call => call.sql === 'COMMIT'));
  }
});


test('genera avisos internos para todos los administradores activos sin exigir teléfono', async () => {
  const { post, calls } = route();
  assert.equal((await post({ seccion: '2.º B' })).status, 200);
  const notification = calls.find(call => call.sql.includes('INSERT INTO notificaciones_whatsapp'));
  assert.ok(notification);
  assert.ok(notification.sql.includes("role = 'admin' AND activo = true"));
  assert.ok(notification.sql.includes("COALESCE(NULLIF(telefono, ''), '-')"));
  assert.equal(notification.params[1], 'solicitud_creada');
  assert.equal(notification.params[2], 10);
  assert.ok(calls.indexOf(notification) < calls.findIndex(call => call.sql === 'COMMIT'));
});
