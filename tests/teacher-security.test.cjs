const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jwt = require('jsonwebtoken');
const { webcrypto } = require('node:crypto');
function load(file, mocks = {}, extra = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, console: { error() {} }, Date, URL, Uint8Array, TextEncoder, TextDecoder, atob, crypto: webcrypto,
      process: { env: { JWT_SECRET: 'isolated-test-secret-do-not-use' } }, require(name) {
        if (name === 'next/server') return { NextResponse: { next: () => ({ status: 200 }), redirect: url => ({ status: 307, location: String(url) }), json: (body, options) => ({ body, status: options?.status || 200 }) } };
        if (name in mocks) return mocks[name]; throw Error(`Módulo sin simular: ${name}`);
      }, ...extra });
  return exports;
}
function request(path, token, method = 'GET') { return { nextUrl: { pathname: path }, url: `http://localhost${path}`, method, cookies: { get: () => token ? { value: token } : undefined } }; }
test('middleware rechaza firmas falsas, vencidos, reset y acceso administrativo del docente', async () => {
  const { middleware } = load('middleware.ts');
  const sign = claims => jwt.sign(claims, 'isolated-test-secret-do-not-use');
  const good = sign({ userId: 4, role: 'profesor', exp: Math.floor(Date.now() / 1000) + 60 });
  const fake = `${good.split('.').slice(0, 2).join('.')}.firma-invalida`;
  assert.equal((await middleware(request('/profesor/dashboard', fake))).status, 307);
  assert.equal((await middleware(request('/api/solicitudes', sign({ userId: 4, role: 'reset', exp: 9999999999 })))).status, 401);
  assert.equal((await middleware(request('/api/solicitudes', sign({ userId: 4, role: 'profesor', exp: 1 })))).status, 401);
  assert.equal((await middleware(request('/api/usuarios', good, 'POST'))).status, 403);
  assert.equal((await middleware(request('/api/prestamos/1', good, 'PUT'))).status, 403);
  assert.equal((await middleware(request('/api/usuarios/99', good, 'GET'))).status, 403);
  assert.equal((await middleware(request('/profesor/horario', good))).status, 200);
  assert.equal((await middleware(request('/api/solicitudes/12/cancelar', good, 'POST'))).status, 200);
  assert.equal((await middleware(request('/api/disponibilidad/12/cancelar', good, 'POST'))).status, 200);
  assert.equal((await middleware(request('/api/disponibilidad/12', good, 'DELETE'))).status, 403);
});
test('la sesión consulta el estado real y rechaza cuentas desactivadas o roles distintos', async () => {
  for (const dbUser of [null, { id: 4, role: 'profesor', activo: false }, { id: 4, role: 'admin', activo: true }]) {
    const { requireSession } = load('app/lib/session.ts', { './auth': { verifyToken: () => ({ userId: 4, role: 'profesor', exp: 9999999999 }), getUserById: async () => dbUser } });
    const result = await requireSession(request('/api/profesor/resumen', 'test'));
    assert.equal(result.response.status, 403);
  }
});
test('el docente no puede consultar solicitudes ni préstamos de otra persona', async () => {
  for (const file of ['solicitudes', 'prestamos']) {
    let params;
    const route = load(`app/api/${file}/route.ts`, { '@/app/lib/session': { requireSession: async () => ({ user: { id: 4, role: 'profesor' }, response: null }) }, '@/app/lib/db': { query: async (sql, values) => { params = values; return { rows: [] }; } }, '@/app/lib/admin-notifications': {} });
    assert.equal((await route.GET(request(`/api/${file}?profesor_id=99`, 'test'))).status, 200);
    assert.equal(params[0], '4');
  }
});
test('reserva: fechas de Lima, cruces de horas y clases semanales son consistentes', () => {
  const utils = load('app/lib/teacher-utils.ts', {}, { Intl });
  assert.equal(utils.schoolDate(new Date('2026-10-17T02:00:00Z')), '2026-10-16');
  const rows = [{ id: 1, dia_semana: 'Lunes', hora_inicio: '08:00', hora_fin: '09:00', estado: 'separado', fecha_reserva: null }, { id: 2, dia_semana: 'Martes', hora_inicio: '10:00', hora_fin: '11:00', estado: 'pendiente', fecha_reserva: '2026-10-20' }];
  assert.equal(utils.reservationsForDate(rows, '2026-10-19').length, 1);
  assert.equal(utils.reservationsForDate(rows, '2026-10-26').length, 1);
  assert.equal(utils.reservationsForDate(rows, '2026-10-20').length, 1);
  assert.equal(utils.overlaps('08:30', '09:30', [rows[0]]), true);
  assert.equal(utils.overlaps('09:00', '09:45', [rows[0]]), false);
});

test('el almanaque ajusta las semanas al mes y conserva los días de años bisiestos', () => {
  const { calendarMonthDays } = load('app/lib/teacher-utils.ts', {}, { Intl });
  assert.equal(calendarMonthDays('2021-02-01').length, 28);
  const leap = calendarMonthDays('2024-02-01');
  assert.equal(leap.length, 35);
  assert.ok(leap.includes('2024-02-29'));
  const october = calendarMonthDays('2026-10-01');
  assert.equal(october.length, 35);
  assert.equal(october[0], '2026-09-28');
  assert.equal(october.at(-1), '2026-11-01');
  assert.equal(calendarMonthDays('fecha-invalida').length, 0);
});

test('la primera hora reservable avanza con el reloj de Lima y se reinicia para fechas futuras', () => {
  const { minimumBookingTime } = load('app/lib/teacher-utils.ts', {}, { Intl });
  const now = Date.parse('2026-10-27T09:48:30-05:00');
  assert.equal(minimumBookingTime('2026-10-27', now), '09:49');
  assert.equal(minimumBookingTime('2026-10-27', now + 60000), '09:50');
  assert.equal(minimumBookingTime('2026-10-28', now), '00:00');
  assert.equal(minimumBookingTime('2026-10-26', now), null);
  assert.equal(minimumBookingTime('2026-10-27', Date.parse('2026-10-27T23:57:30-05:00')), '23:58');
  assert.equal(minimumBookingTime('2026-10-27', Date.parse('2026-10-27T23:58:30-05:00')), null);
  assert.equal(minimumBookingTime('2026-10-27', Date.parse('2026-10-27T23:59:30-05:00')), null);
});

test('validar turnos futuros admite las horas con segundos guardadas por PostgreSQL', () => {
  const { isFutureSlot } = load('app/lib/teacher-utils.ts', {}, { Intl });
  const now = Date.parse('2026-10-27T09:48:30-05:00');
  assert.equal(isFutureSlot('2026-10-27', '10:30:00', now), true);
  assert.equal(isFutureSlot('2026-10-27', '09:30:00', now), false);
  assert.equal(isFutureSlot('2026-10-28', '08:30:00', now), true);
});
test('editar el perfil no permite elevar permisos y exige contraseña actual', async () => {
  let writes = 0;
  const route = load('app/api/usuarios/[id]/route.ts', { '@/app/lib/session': { requireSession: async () => ({ user: { id: 4, role: 'profesor' }, response: null }) }, '@/app/lib/auth': { hashPassword: async () => 'hash', comparePassword: async () => false }, '@/app/lib/db': { query: async sql => { if (sql.startsWith('UPDATE')) writes++; return { rows: [{ password: 'hash' }] }; } } });
  for (const body of [{ role: 'admin' }, { activo: true }, { email: 'otro' }, { password: 'contraseña-nueva', current_password: 'incorrecta' }]) {
    const response = await route.PUT({ ...request('/api/usuarios/4', 'test'), json: async () => body }, { params: { id: '4' } });
    assert.ok([400, 403].includes(response.status));
  }
  assert.equal(writes, 0);
});
