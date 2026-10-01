const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup({ stock = 5, teacher = true, failNotice = false } = {}) {
  const calls = [];
  let released = false;
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT id, telefono FROM usuarios')) return { rows: teacher ? [{ id: 4, telefono: null }] : [] };
      if (sql.includes('SELECT id, nombre, cantidad_disponible')) return { rows: [{ id: 2, nombre: 'Proyector', cantidad_disponible: stock }] };
      if (sql.includes('INSERT INTO prestamos')) return { rows: [{ id: 15 }] };
      if (sql.includes('INSERT INTO notificaciones_whatsapp') && failNotice) throw new Error('notification failure');
      return { rows: [] };
    },
    release() { released = true; },
  };
  const exported = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../app/api/prestamos/route.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports: exported, console: { error() {} }, require(name) {
    if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
    if (name === '@/app/lib/db') return { getClient: async () => client };
    throw new Error(name);
  } });
  return { calls, released: () => released, submit: () => exported.POST({ json: async () => ({ profesor_id: 4, inventario_id: 2, cantidad: 2, detalle: 'Unidad P2' }) }) };
}

test('préstamo directo notifica al profesor seleccionado sin teléfono ni solicitud previa', async () => {
  const run = setup();
  assert.equal((await run.submit()).status, 200);
  const notices = run.calls.filter(call => call.sql.includes('INSERT INTO notificaciones_whatsapp'));
  assert.equal(notices.length, 1);
  const [recipient, phone, message, type, reference] = notices[0].params;
  assert.equal(recipient, 4);
  assert.equal(phone, '-');
  assert.equal(type, 'prestamo_registrado');
  assert.equal(reference, 15);
  assert.match(message, /Proyector, 2 unidades/);
  assert.match(message, /Unidad P2/);
  assert.equal(run.calls.at(-1).sql, 'COMMIT');
  assert.ok(run.released());
});

test('no notifica si no hay stock o el profesor no está disponible', async () => {
  for (const options of [{ stock: 0 }, { teacher: false }]) {
    const run = setup(options);
    assert.equal((await run.submit()).status, 400);
    assert.ok(!run.calls.some(call => call.sql.includes('INSERT INTO notificaciones_whatsapp')));
    assert.ok(!run.calls.some(call => call.sql.includes('INSERT INTO prestamos')));
    assert.equal(run.calls.at(-1).sql, 'ROLLBACK');
    assert.ok(run.released());
  }
});

test('si falla el aviso se revierte también el préstamo y el descuento de stock', async () => {
  const run = setup({ failNotice: true });
  assert.equal((await run.submit()).status, 500);
  assert.equal(run.calls.at(-1).sql, 'ROLLBACK');
  assert.ok(!run.calls.some(call => call.sql === 'COMMIT'));
  assert.ok(run.released());
});
