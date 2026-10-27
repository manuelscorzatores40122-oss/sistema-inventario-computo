const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, Date, console: { error() {} }, require(name) {
      if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
      if (name in mocks) return mocks[name];
      throw Error(name);
    },
  });
  return exports;
}
const dates = load('app/lib/reservation-start.ts');

function setup({ row = {}, linked = true, fail = false, approved = true, request = false } = {}) {
  const calls = [];
  let released = false;
  const reservation = { id: 20, fecha_reserva: '2099-10-20', hora_inicio: '09:10:00', hora_fin: '10:25:00', estado: 'separado', reservado_por: 3, ...row };
  const client = { async query(sql, params) {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT * FROM solicitudes')) return { rows: [{ id: 9, profesor_id: 3, estado: approved ? 'aprobada' : 'pendiente', disponibilidad_id: 20 }] };
    if (sql.startsWith('SELECT id, profesor_id FROM solicitudes')) return { rows: linked ? [{ id: 9, profesor_id: 3 }] : [] };
    if (sql.startsWith('SELECT * FROM disponibilidad')) return { rows: [reservation] };
    if (sql.startsWith('SELECT nombre')) return { rows: [{ nombre: 'Ana', apellido: 'Docente' }] };
    if (fail && sql.includes('INSERT INTO notificaciones_whatsapp')) throw Error('Aviso falló');
    return { rows: [] };
  }, release() { released = true; } };
  const { POST } = load(`app/api/${request ? 'solicitudes' : 'disponibilidad'}/[id]/cancelar/route.ts`, {
    '@/app/lib/db': { getClient: async () => client },
    '@/app/lib/session': { requireSession: async () => ({ user: { id: 3, nombre: 'Ana', apellido: 'Docente', role: 'profesor' }, response: null }) },
    '@/app/lib/admin-notifications': load('app/lib/admin-notifications.ts'),
    '@/app/lib/reservation-start': dates,
  });
  return { run: () => POST({}, { params: { id: request ? '9' : '20' } }), calls, released: () => released };
}

test('cancelar una reserva aprobada libera su turno y notifica dentro de la transacción', async () => {
  for (const request of [false, true]) {
    const fixture = setup({ request });
    assert.equal((await fixture.run()).status, 200);
    const { calls } = fixture;
    assert.ok(calls.some(call => call.sql.includes("UPDATE disponibilidad SET estado = 'disponible'")));
    assert.ok(calls.some(call => call.sql.includes("UPDATE solicitudes SET estado = 'cancelada'")));
    const notice = calls.findIndex(call => call.sql.includes('INSERT INTO notificaciones_whatsapp'));
    assert.ok(notice > 0 && notice < calls.findIndex(call => call.sql === 'COMMIT'));
    assert.ok(calls[notice].params[0].includes('2099-10-20'));
    assert.equal(calls.at(-1).sql, 'COMMIT');
    assert.ok(fixture.released());
  }
});

test('la reserva asignada directamente también avisa a los administradores activos', async () => {
  const { run, calls } = setup({ linked: false });
  assert.equal((await run()).status, 200);
  const notice = calls.find(call => call.sql.includes('INSERT INTO notificaciones_whatsapp'));
  assert.ok(notice.sql.includes("role = 'admin' AND activo = true"));
  assert.ok(notice.sql.includes('reserva_cancelada'));
});

test('rechaza reservas ajenas, semanales, iniciadas o ya liberadas sin modificar datos', async () => {
  for (const row of [{ reservado_por: 99 }, { fecha_reserva: null }, { fecha_reserva: '2020-01-01' }, { fecha_reserva: 'invalida' }, { estado: 'disponible', reservado_por: null }]) {
    const { run, calls } = setup({ row });
    assert.ok([404, 409].includes((await run()).status));
    assert.equal(calls.at(-1).sql, 'ROLLBACK');
    assert.equal(calls.some(call => call.sql.startsWith('UPDATE') || call.sql.includes('INSERT INTO notificaciones')), false);
  }
});

test('un fallo al notificar revierte la cancelación y la liberación', async () => {
  for (const linked of [false, true]) {
    const fixture = setup({ fail: true, linked });
    assert.equal((await fixture.run()).status, 500);
    assert.equal(fixture.calls.at(-1).sql, 'ROLLBACK');
    assert.equal(fixture.calls.some(call => call.sql === 'COMMIT'), false);
    assert.ok(fixture.released());
  }
});

test('la hora de inicio conserva la fecha de pg y aplica la zona de Lima', () => {
  assert.equal(dates.reservationDate(new Date(2099, 9, 20)), '2099-10-20');
  assert.equal(dates.reservationStart('2099-10-20', '09:10:00'), Date.parse('2099-10-20T14:10:00Z'));
});
