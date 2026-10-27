const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    {
      exports,
      ...globals,
      console: { error() {} },
      require(name) {
        if (name === "next/server")
          return {
            NextResponse: {
              json: (body, options) => ({
                body,
                status: options?.status || 200,
              }),
            },
          };
        if (name in mocks) return mocks[name];
        throw Error(name);
      },
    },
  );
  return exports;
}
test("liberar una reserva cancela su solicitud y avisa dentro de la misma transacción; un fallo revierte todo", async () => {
  for (const fail of [false, true]) {
    const calls = [];
    let released = false;
    const client = {
      async query(sql, params) {
        calls.push({ sql, params });
        if (sql.startsWith("SELECT * FROM disponibilidad"))
          return { rows: [{ id: 2, estado: "separado" }] };
        if (sql.startsWith("UPDATE solicitudes"))
          return { rows: [{ id: 12, profesor_id: 8 }] };
        if (sql.includes("INSERT INTO notificaciones") && fail)
          throw Error("Fallo aviso");
        if (sql.startsWith("UPDATE disponibilidad"))
          return { rows: [{ id: 2 }] };
        return { rows: [] };
      },
      release() {
        released = true;
      },
    };
    const route = load("app/api/disponibilidad/[id]/route.ts", {
      "@/app/lib/session": {
        requireSession: async () => ({
          user: { id: 1, role: "admin" },
          response: null,
        }),
      },
      "@/app/lib/db": { getClient: async () => client },
      "@/app/lib/availability": {},
    });
    const response = await route.DELETE({}, { params: { id: "2" } });
    assert.equal(response.status, fail ? 500 : 200);
    assert.equal(calls.at(-1).sql, fail ? "ROLLBACK" : "COMMIT");
    assert.ok(released);
    assert.ok(calls.some((c) => c.sql.includes("pg_advisory_xact_lock")));
    const notice = calls.find((c) =>
      c.sql.includes("INSERT INTO notificaciones"),
    );
    assert.equal(notice.params[0], 8);
    assert.equal(notice.params[2], 12);
  }
});
test("la edición directa de un turno asociado a una solicitud queda bloqueada para preservar su estado", async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql.startsWith("SELECT * FROM disponibilidad"))
        return { rows: [{ id: 2, estado: "separado" }] };
      if (sql.startsWith("SELECT id FROM solicitudes"))
        return { rows: [{ id: 12 }] };
      return { rows: [] };
    },
    release() {},
  };
  const { saveAvailability } = load("app/lib/availability.ts", {
    "./session": {
      requireSession: async () => ({
        user: { id: 1, role: "admin" },
        response: null,
      }),
    },
    "./db": { getClient: async () => client },
    "./teacher-utils": { WEEKDAYS: ["Lunes"] },
  });
  const response = await saveAvailability({ json: async () => ({}) }, "2");
  assert.equal(response.status, 409);
  assert.equal(calls.at(-1), "ROLLBACK");
  assert.equal(
    calls.some((sql) => sql.startsWith("UPDATE disponibilidad")),
    false,
  );
});


test('liberar un turno asignado directamente también notifica al docente sin solicitud previa', async () => {
  const calls = [];
  const client = { async query(sql, params) {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT * FROM disponibilidad')) return { rows: [{ id: 22, reservado_por: 8, estado: 'separado', hora_inicio: '09:00', hora_fin: '10:00', fecha_reserva: '2099-10-20' }] };
    if (sql.startsWith('UPDATE disponibilidad')) return { rows: [{ id: 22 }] };
    return { rows: [] };
  }, release() {} };
  const route = load('app/api/disponibilidad/[id]/route.ts', {
    '@/app/lib/session': { requireSession: async () => ({ user: { id: 1, role: 'admin' }, response: null }) },
    '@/app/lib/db': { getClient: async () => client }, '@/app/lib/availability': {},
  });
  assert.equal((await route.DELETE({}, { params: { id: '22' } })).status, 200);
  const notice = calls.find(call => call.sql.includes('INSERT INTO notificaciones_whatsapp'));
  assert.equal(notice.params[0], 8);
  assert.ok(notice.sql.includes('reserva_cancelada'));
  assert.equal(calls.at(-1).sql, 'COMMIT');
});


test('administración rechaza turnos puntuales pasados, iniciados o que comienzan ahora sin escribir', async () => {
  const now = Date.parse('2026-10-27T09:00:00-05:00');
  const Clock = class extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
  const utils = load('app/lib/teacher-utils.ts', {}, { Date: Clock, Intl });
  for (const values of [
    { fecha_reserva:'2026-10-27', hora_inicio:'07:00', hora_fin:'08:00' },
    { fecha_reserva:'2026-10-27', hora_inicio:'08:30', hora_fin:'10:00' },
    { fecha_reserva:'2026-10-27', hora_inicio:'09:00', hora_fin:'10:00' },
    { fecha_reserva:'2026-10-26', hora_inicio:'10:00', hora_fin:'11:00' },
  ]) {
    for (const id of [undefined, '22']) {
      const calls = [];
      const client = { async query(sql) {
        calls.push(sql);
        if (sql.startsWith('SELECT * FROM disponibilidad')) return { rows:[{ id:22, estado:'separado' }] };
        return { rows:[] };
      }, release() {} };
      const { saveAvailability } = load('app/lib/availability.ts', {
        './db': { getClient: async () => client },
        './session': { requireSession: async () => ({ user:{id:1,role:'admin'}, response:null }) },
        './teacher-utils': utils,
      }, { Date:Clock });
      const response = await saveAvailability({ json:async () => ({ sala_nombre:'Sala de Cómputo', dia_semana:'Martes', estado:'separado', reservado_por:8, es_recurrente:false, motivo_reserva:'Clase', ...values }) }, id);
      assert.equal(response.status, 400);
      assert.ok(response.body.error.includes('ya comenzó'));
      assert.equal(calls.at(-1), 'ROLLBACK');
      assert.equal(calls.some(sql => sql.startsWith('INSERT') || sql.startsWith('UPDATE')), false);
    }
  }
});

test('administración permite horas futuras, mañana por la mañana y la configuración semanal', async () => {
  const now = Date.parse('2026-10-27T09:00:00-05:00');
  const Clock = class extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
  const utils = load('app/lib/teacher-utils.ts', {}, { Date: Clock, Intl });
  for (const values of [
    { fecha_reserva:'2026-10-27', hora_inicio:'09:01', hora_fin:'10:00', es_recurrente:false },
    { fecha_reserva:'2026-10-28', hora_inicio:'07:00', hora_fin:'08:00', es_recurrente:false },
    { fecha_reserva:null, hora_inicio:'07:00', hora_fin:'08:00', es_recurrente:true },
  ]) {
    const calls = [];
    const client = { async query(sql) {
      calls.push(sql);
      if (sql.startsWith('SELECT id FROM usuarios')) return { rows:[{id:8}] };
      if (sql.startsWith('INSERT INTO disponibilidad')) return { rows:[{id:22}] };
      return { rows:[] };
    }, release() {} };
    const { saveAvailability } = load('app/lib/availability.ts', {
      './db': { getClient: async () => client },
      './session': { requireSession: async () => ({ user:{id:1,role:'admin'}, response:null }) },
      './teacher-utils': utils,
    }, { Date:Clock });
    const response = await saveAvailability({ json:async () => ({ sala_nombre:'Sala de Cómputo', dia_semana:'Martes', estado:'separado', reservado_por:8, motivo_reserva:'Clase', ...values }) });
    assert.equal(response.status, 200);
    assert.equal(calls.at(-1), 'COMMIT');
  }
});
