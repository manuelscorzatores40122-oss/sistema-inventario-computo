const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup({ stock = 5, teacher = true, failNotice = false, stocks = {}, failLoan = 0 } = {}) {
  const calls = [];
  let released = false;
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT id, telefono FROM usuarios')) return { rows: teacher ? [{ id: 4, telefono: null }] : [] };
      if (sql.includes('SELECT id, nombre, cantidad_disponible')) return { rows: [{ id: params[0], nombre: params[0] === 2 ? 'Proyector' : `Equipo ${params[0]}`, cantidad_disponible: stocks[params[0]] ?? stock }] };
      if (sql.includes('INSERT INTO prestamos')) {
        const count = calls.filter(call => call.sql.includes('INSERT INTO prestamos')).length;
        if (count === failLoan) throw new Error('loan failure');
        return { rows: [{ id: 14 + count, inventario_id: params[0], cantidad: params[2] }] };
      }
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
  return { calls, released: () => released, submit: (body = { profesor_id: 4, inventario_id: 2, cantidad: 2, detalle: 'Unidad P2' }) => exported.POST({ json: async () => body }) };
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

const batch = { profesor_id: 4, articulos: [
  { inventario_id: 3, cantidad: 2, detalle: 'Controles Primero B y Segundo B' },
  { inventario_id: 2, cantidad: 12, detalle: 'Laptops 01–12' },
  { inventario_id: 4, cantidad: 12, detalle: 'Cargadores' },
] };

test('registra varios artículos con cantidades y detalles; envía un solo aviso', async () => {
  const run = setup({ stock: 20 });
  const response = await run.submit(batch);
  assert.equal(response.status, 200);
  assert.equal(response.body.prestamos.length, 3);
  const locks = run.calls.filter(call => call.sql.includes('FOR UPDATE'));
  assert.deepEqual(locks.map(call => call.params[0]), [2, 3, 4]);
  const loans = run.calls.filter(call => call.sql.includes('INSERT INTO prestamos'));
  assert.deepEqual(loans.map(call => Array.from(call.params)), [[3, 4, 2, batch.articulos[0].detalle], [2, 4, 12, 'Laptops 01–12'], [4, 4, 12, 'Cargadores']]);
  const updates = run.calls.filter(call => call.sql.startsWith('UPDATE inventario'));
  assert.deepEqual(updates.map(call => Array.from(call.params)), [[2, 3], [12, 2], [12, 4]]);
  const notices = run.calls.filter(call => call.sql.includes('INSERT INTO notificaciones_whatsapp'));
  assert.equal(notices.length, 1);
  assert.equal(notices[0].params[0], 4);
  for (const item of batch.articulos) assert.ok(notices[0].params[2].includes(item.detalle));
  assert.equal(run.calls.at(-1).sql, 'COMMIT');
});

test('stock insuficiente en un artículo impide guardar toda la entrega', async () => {
  const run = setup({ stock: 20, stocks: { 4: 1 } });
  assert.equal((await run.submit(batch)).status, 400);
  assert.ok(!run.calls.some(call => call.sql.includes('INSERT INTO prestamos') || call.sql.startsWith('UPDATE inventario')));
  assert.equal(run.calls.at(-1).sql, 'ROLLBACK');
});

test('fallo al insertar el segundo préstamo revierte toda la transacción', async () => {
  const run = setup({ stock: 20, failLoan: 2 });
  assert.equal((await run.submit(batch)).status, 500);
  assert.equal(run.calls.at(-1).sql, 'ROLLBACK');
  assert.ok(!run.calls.some(call => call.sql === 'COMMIT' || call.sql.includes('INSERT INTO notificaciones_whatsapp')));
  assert.ok(run.released());
});

test('rechaza listas vacías, artículos repetidos y cantidades inválidas antes de escribir', async () => {
  for (const articulos of [[], null, [null], [{ inventario_id: 2, cantidad: 0 }], [{ inventario_id: 2, cantidad: 1.5 }], [{ inventario_id: 2, cantidad: 1 }, { inventario_id: 2, cantidad: 2 }]]) {
    const run = setup();
    assert.equal((await run.submit({ profesor_id: 4, articulos })).status, 400);
    assert.equal(run.calls.length, 0);
  }
});
