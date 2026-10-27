const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, Buffer, TextEncoder, Date, process: { env: {} }, require(name) {
    if (name === 'crypto') return require('node:crypto');
    if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200, headers: options?.headers, cookies: { set() {} } }) } };
    if (name in mocks) return mocks[name];
    throw Error(`Falta simular ${name}`);
  } });
  return exports;
}
const recovery = load('app/lib/recovery.ts', { './db': {} });
const raw = '0123456789ABCDEF0123456789ABCDEF';
const hash = recovery.recoveryHash(raw);
const input = { dni: '12345678', code: raw, password: 'NuevaClave123!', password_confirmation: 'NuevaClave123!' };
const request = body => ({ json: async () => body });

test('el código es aleatorio, acepta guiones y espacios, y solo se conserva su huella', () => {
  const codes = Array.from({ length: 20 }, () => recovery.newRecoveryCode());
  assert.equal(new Set(codes.map(c => c.code)).size, 20);
  for (const code of codes) {
    assert.match(code.code, /^(?:[A-F0-9]{4}-){7}[A-F0-9]{4}$/);
    assert.match(code.hash, /^[a-f0-9]{64}$/);
    assert.ok(recovery.recoveryMatches(recovery.normalizeRecoveryCode(code.code.toLowerCase()), code.hash));
  }
  assert.equal(recovery.normalizeRecoveryCode('0123 4567-89ab cdef-0123-4567-89ab-cdef'), raw);
  for (const value of [null, '', '12345678', raw + 'X', raw.repeat(4)]) assert.equal(recovery.normalizeRecoveryCode(value), null);
  assert.equal(recovery.recoveryMatches(raw, null), false);
  assert.equal(recovery.recoveryMatches(raw, recovery.recoveryHash('otro')), false);
});

function reset({ exists = true, active = true, allowed = true, fail = false } = {}) {
  const calls = [];
  let stored = hash, currentPassword = 'anterior', released = 0;
  const route = load('app/api/auth/forgot-password/route.ts', {
    '@/app/lib/recovery': { ...recovery, allowRecoveryAttempt: async () => allowed },
    '@/app/lib/auth': { hashPassword: async password => 'bcrypt:' + password },
    '@/app/lib/db': { getClient: async () => {
      let pending;
      return {
        async query(sql, params) {
          calls.push({ sql, params });
          if (sql.startsWith('SELECT')) {
            assert.ok(sql.includes('FOR UPDATE') && sql.includes('activo = true'));
            return { rows: exists && active ? [{ id: 4, codigo_recuperacion_hash: stored }] : [] };
          }
          if (sql.startsWith('UPDATE')) {
            if (fail) throw Error('Fallo de escritura simulado');
            assert.ok(sql.includes('codigo_recuperacion_hash = NULL') && sql.includes('session_version = session_version + 1'));
            pending = params[0];
          }
          if (sql === 'COMMIT') { stored = null; currentPassword = pending; }
          return { rows: [] };
        }, release() { released++; },
      };
    } },
  });
  return { route, calls, released: () => released, password: () => currentPassword };
}

test('recupera con DNI y código, consume el código y no permite reutilizarlo', async () => {
  const run = reset();
  assert.equal((await run.route.POST(request(input))).status, 200);
  assert.equal(run.password(), 'bcrypt:' + input.password);
  assert.equal(run.calls.at(-1).sql, 'COMMIT');
  assert.equal((await run.route.POST(request(input))).status, 400);
  assert.equal(run.released(), 2);
});

test('DNI solo, código incorrecto, cuenta inexistente o inactiva no cambian ninguna contraseña', async () => {
  const withoutCode = reset();
  assert.equal((await withoutCode.route.POST(request({ ...input, code: '' }))).status, 400);
  assert.equal(withoutCode.calls.length, 0);
  const messages = [];
  for (const options of [{ exists: false }, { active: false }, {}]) {
    const run = reset(options);
    const result = await run.route.POST(request({ ...input, code: 'F'.repeat(32) }));
    assert.equal(result.status, 400);
    messages.push(result.body.error);
    assert.equal(run.password(), 'anterior');
    assert.ok(!run.calls.some(c => c.sql.startsWith('UPDATE')));
  }
  assert.equal(new Set(messages).size, 1);
});

test('la recuperación limita intentos y revierte si falla la escritura', async () => {
  const blocked = reset({ allowed: false });
  const response = await blocked.route.POST(request(input));
  assert.equal(response.status, 429);
  assert.equal(response.headers['Retry-After'], '900');
  assert.equal(blocked.calls.length, 0);
  const failed = reset({ fail: true });
  assert.equal((await failed.route.POST(request(input))).status, 503);
  assert.equal(failed.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(failed.password(), 'anterior');
  assert.equal(failed.released(), 1);
});

test('rechaza contraseñas cortas, demasiado largas en bytes o sin confirmación', async () => {
  for (const values of [{ password: 'corta', password_confirmation: 'corta' }, { password: '🔑'.repeat(19), password_confirmation: '🔑'.repeat(19) }, { password_confirmation: 'distinta' }]) {
    const run = reset();
    assert.equal((await run.route.POST(request({ ...input, ...values }))).status, 400);
    assert.equal(run.calls.length, 0);
  }
});

test('generar o reemplazar exige sesión y contraseña actual y usa el usuario de la sesión', async () => {
  for (const denied of [true, false]) for (const correct of [true, false]) {
    const calls = [];
    const route = load('app/api/auth/recovery-code/route.ts', {
      '@/app/lib/session': { requireSession: async () => denied ? { response: { status: 401 } } : { user: { id: 4, dni: '12345678' } } },
      '@/app/lib/auth': { comparePassword: async () => correct },
      '@/app/lib/recovery': { ...recovery, allowRecoveryAttempt: async () => true },
      '@/app/lib/db': { query: async (sql, params) => { calls.push({ sql, params }); return { rows: [{ id: 4, password: 'bcrypt-anterior', configurado: true }] }; } },
    });
    const response = await route.POST(request({ current_password: 'actual', userId: 999 }));
    assert.equal(response.status, denied ? 401 : correct ? 200 : 400);
    const update = calls.find(c => c.sql.startsWith('UPDATE'));
    if (denied || !correct) assert.equal(update, undefined);
    else {
      assert.equal(update.params[1], 4);
      assert.equal(update.params[2], 'bcrypt-anterior');
      assert.equal(update.params[0], recovery.recoveryHash(recovery.normalizeRecoveryCode(response.body.code)));
      assert.equal(response.body.hash, undefined);
      assert.equal(response.headers['Cache-Control'], 'private, no-store');
      const status = await route.GET({});
      assert.equal(status.body.configurado, true);
      assert.equal(Object.keys(status.body).length, 1);
    }
  }
});

test('los límites usan PostgreSQL compartido y no almacenan el identificador en claro', async () => {
  const calls = [];
  let attempts = 0;
  const limiter = load('app/lib/recovery.ts', { './db': { query: async (sql, params) => { calls.push({ sql, params }); return { rows: [{ intentos: ++attempts }] }; } } });
  for (let i = 0; i < 6; i++) assert.equal(await limiter.allowRecoveryAttempt('reset:12345678'), i < 5);
  assert.equal(calls[0].params[0], recovery.recoveryHash('reset:12345678'));
  assert.ok(calls[0].sql.includes('ON CONFLICT') && calls[0].sql.includes("INTERVAL '15 minutes'"));
});

test('recuperar el acceso invalida sesiones anteriores pero permite la nueva versión', async () => {
  for (const version of [0, 1]) {
    const sessions = load('app/lib/session.ts', { './auth': {
      verifyToken: () => ({ userId: 4, role: 'profesor', exp: 9999999999, sessionVersion: version }),
      getUserById: async () => ({ id: 4, role: 'profesor', activo: true, session_version: 1 }),
    } });
    const result = await sessions.requireSession({ cookies: { get: () => ({ value: 'token' }) } });
    assert.equal(result.response?.status || 200, version === 0 ? 401 : 200);
  }
});

test('el siguiente inicio de sesión emite la versión nueva sin exponer la huella de recuperación', async () => {
  let version;
  const route = load('app/api/auth/login/route.ts', { '@/app/lib/auth': {
    getUserByEmail: async () => ({ id: 4, role: 'profesor', activo: true, password: 'hash', session_version: 3, codigo_recuperacion_hash: 'privado' }),
    comparePassword: async () => true,
    generateToken: (id, role, sessionVersion) => { version = sessionVersion; return 'token'; },
  } });
  const result = await route.POST(request({ email: '12345678', password: 'válida' }));
  assert.equal(result.status, 200);
  assert.equal(version, 3);
  assert.equal(result.body.user.codigo_recuperacion_hash, undefined);
  assert.equal(result.body.user.password, undefined);
});
