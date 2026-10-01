const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup(actor, currentState) {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({sql, params});
      if (sql.includes('SELECT s.*')) return { rows: [{ id: 8, estado: currentState, profesor_id: 4, inventario_id: 2, cantidad_solicitada: 1, cantidad_disponible: 5, item_nombre: 'Proyector' }] };
      return { rows: [{ id: 8 }] };
    }, release() {},
  };
  const exported = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../app/api/solicitudes/[id]/route.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports: exported, console, require(name) {
    if (name === 'next/server') return { NextResponse: { json: (body, options) => ({body, status: options?.status || 200}) } };
    if (name === '@/app/lib/db') return { getClient: async () => client };
    if (name === '@/app/lib/auth') return { verifyToken: () => actor };
    throw new Error(name);
  } });
  return { calls, decide: estado => exported.PUT({ cookies: { get: () => ({ value: 'test' }) }, json: async () => ({ estado, admin_id: 999 }) }, { params: { id: '8' } }) };
}

test('solo administradores pueden decidir; repetir aprobación no descuenta stock', async () => {
  for (const actor of [null, { role: 'profesor', userId: 4 }]) {
    const {calls, decide} = setup(actor, 'pendiente');
    assert.equal((await decide('aprobada')).status, 403);
    assert.equal(calls.length, 0);
  }
  const {calls, decide} = setup({ role: 'admin', userId: 1 }, 'aprobada');
  assert.equal((await decide('aprobada')).status, 409);
  assert.ok(!calls.some(call => call.sql.startsWith('UPDATE inventario')));
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
});

test('aprobar o rechazar usa el administrador autenticado y notifica al profesor', async () => {
  for (const state of ['aprobada', 'rechazada']) {
    const {calls, decide} = setup({ role: 'admin', userId: 1 }, 'pendiente');
    assert.equal((await decide(state)).status, 200);
    const update = calls.find(call => call.sql.includes('UPDATE solicitudes'));
    assert.equal(update.params[3], 1);
    const notice = calls.find(call => call.sql.includes('INSERT INTO notificaciones_whatsapp'));
    assert.equal(notice.params[0], 4);
    assert.equal(notice.params[3], `solicitud_${state}`);
    assert.equal(calls.at(-1).sql, 'COMMIT');
  }
});
