const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, requireMock) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: requireMock, console: { error() {} } });
  return exports;
}

test('cancelación notifica dentro de la transacción; fallo revierte la operación', async () => {
  for (const fail of [false, true]) {
    const calls = [];
    const client = { async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT * FROM solicitudes')) return { rows: [{ id: 9, estado: 'pendiente', disponibilidad_id: 2 }] };
      if (sql.startsWith('SELECT nombre')) return { rows: [{ nombre: 'Docente', apellido: 'Prueba' }] };
      if (fail && sql.includes('INSERT INTO notificaciones_whatsapp')) throw new Error('Fallo simulado');
      return { rows: [] };
    }, release() {} };
    const helper = load('app/lib/admin-notifications.ts');
    const route = load('app/api/solicitudes/[id]/cancelar/route.ts', name => {
      if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
      if (name === '@/app/lib/auth') return { verifyToken: () => ({ userId: 3 }) };
      if (name === '@/app/lib/db') return { getClient: async () => client };
      if (name === '@/app/lib/admin-notifications') return helper;
      throw new Error(name);
    });
    const response = await route.POST({ cookies: { get: () => ({ value: 'test' }) } }, { params: { id: '9' } });
    assert.equal(response.status, fail ? 500 : 200);
    assert.equal(calls[1].params[1], 3);
    const notification = calls.find(call => call.sql.includes('INSERT INTO notificaciones_whatsapp'));
    assert.equal(notification.params[1], 'solicitud_cancelada');
    assert.ok(notification.params[0].includes('Docente Prueba canceló'));
    assert.equal(calls.at(-1).sql, fail ? 'ROLLBACK' : 'COMMIT');
  }
});
