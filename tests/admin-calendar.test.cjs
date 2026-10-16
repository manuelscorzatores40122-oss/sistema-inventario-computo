const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, mocks) {
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
