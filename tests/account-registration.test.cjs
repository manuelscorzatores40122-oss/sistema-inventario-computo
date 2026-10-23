const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, TextEncoder, console: { error() {} }, require(name) { if (name in mocks) return mocks[name]; if (name === 'next/server') return { NextResponse: { json: (body, opts) => ({ body, status: opts?.status || 200 }) } }; throw Error(name); } });
  return exports;
}
const validation = load('app/lib/account-validation.ts');
const valid = { dni: '98017642', nombre: 'Docente', apellido: 'Prueba', password: 'Prueba1234', telefono: '987654321', correo_personal: 'docente@example.com', area: 'Ciencias' };
function setup({ existing = false, failNotice = false } = {}) {
  const calls = [];
  const client = { query: async (sql, params) => { calls.push({ sql, params }); if (sql.startsWith('SELECT id FROM usuarios')) return { rows: existing ? [{ id: 12 }] : [] }; if (failNotice && sql.includes('INSERT INTO notificaciones_whatsapp')) throw Error('Conexión interrumpida'); return { rows: [] }; }, release() {} };
  let creation;
  const route = load('app/api/auth/register/route.ts', { '@/app/lib/db': { getClient: async () => client }, '@/app/lib/account-validation': validation, '@/app/lib/auth': { createUser: async (...args) => { creation = args; return { id: 12, activo: args[7], role: args[4] }; } } });
  return { post: body => route.POST({ json: async () => body }), calls, creation: () => creation };
}
test('registro valida DNI, tipos, campos vacíos y longitudes antes de conectar', async () => {
  for (const change of [{ dni: '123' }, { dni: '123456789' }, { nombre: '   ' }, { apellido: {} }, { telefono: '9'.repeat(21) }, { correo_personal: 'incorrecto' }, { password: 123456789 }]) {
    const run = setup(); const result = await run.post({ ...valid, ...change });
    assert.equal(result.status, 400); assert.equal(run.calls.length, 0); assert.ok(result.body.error);
  }
});
test('registro crea una cuenta inactiva y avisa a administradores en la misma transacción', async () => {
  const run = setup(); const result = await run.post(valid);
  assert.equal(result.status, 201);
  assert.equal(run.creation()[4], 'profesor'); assert.equal(run.creation()[7], false);
  assert.equal(run.calls[0].sql, 'BEGIN'); assert.equal(run.calls.at(-1).sql, 'COMMIT');
  const notice = run.calls.find(row => row.sql.includes('INSERT INTO notificaciones_whatsapp'));
  assert.match(notice.sql, /role = 'admin' AND activo = true/); assert.equal(notice.params[1], 12);
});
test('DNI duplicado responde 409; un fallo de notificación revierte el alta', async () => {
  const duplicate = setup({ existing: true }); assert.equal((await duplicate.post(valid)).status, 409); assert.equal(duplicate.creation(), undefined); assert.equal(duplicate.calls.at(-1).sql, 'ROLLBACK');
  const failed = setup({ failNotice: true }); assert.equal((await failed.post(valid)).status, 503); assert.equal(failed.calls.at(-1).sql, 'ROLLBACK');
});
test('crear una cuenta con correo largo no lo fuerza dentro de la columna DNI de 20 caracteres', async () => {
  let inserted;
  const auth = load('app/lib/auth.ts', { './db': { query: async (sql, params) => { inserted = params; return { rows: [{ id: 8 }] }; } }, bcryptjs: { default: { genSalt: async () => 'salt', hash: async () => 'hash' } }, jsonwebtoken: { default: {} } });
  await auth.createUser('administracion.del.colegio@example.com', 'Admin', 'Colegio', 'Prueba1234', 'admin');
  assert.equal(inserted[8], null); assert.equal(inserted[0], 'administracion.del.colegio@example.com');
});

test('bcrypt rechaza claves superiores a 72 bytes sin truncarlas', () => {
  assert.equal(validation.validateAccountInput({ ...valid, password: 'a'.repeat(72) }, true), null);
  assert.ok(validation.validateAccountInput({ ...valid, password: 'a'.repeat(73) }, true));
  assert.ok(validation.validateAccountInput({ ...valid, password: '\u00e9'.repeat(37) }, true));
});

test('alta administrativa informa duplicado y permite la clave inicial para DNI', async () => {
  let duplicate = true;
  let args;
  const route = load('app/api/usuarios/route.ts', {
    '@/app/lib/account-validation': validation,
    '@/app/lib/session': { requireSession: async () => ({}) },
    '@/app/lib/db': { query: async () => ({ rows: [] }) },
    '@/app/lib/auth': {
      getUserByEmail: async () => duplicate ? { id: 1 } : null,
      createUser: async (...values) => { args = values; return { id: 2 }; }
    }
  });
  const request = { json: async () => ({ ...valid, password: '' }) };
  assert.equal((await route.POST(request)).status, 409);
  duplicate = false;
  assert.equal((await route.POST(request)).status, 200);
  assert.equal(args[3], valid.dni);
  assert.equal(args[7], true);
  assert.equal((await route.POST({ json: async () => null })).status, 400);
});
