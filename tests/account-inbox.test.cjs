const { test } = require("node:test");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript");
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
function setup({ state = "pendiente", fail = false, denied = false } = {}) {
  const calls = [];
  let released = false;
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT id, estado_registro"))
        return { rows: [{ id: 12, estado_registro: state }] };
      if (sql.includes("INSERT INTO notificaciones") && fail)
        throw Error("Fallo simulado");
      return { rows: [] };
    },
    release() {
      released = true;
    },
  };
  const mocks = {
    "@/app/lib/session": {
      requireSession: async (req, adminOnly) => {
        assert.equal(adminOnly, true);
        return denied
          ? { response: { status: 403 } }
          : { user: { id: 1, role: "admin" }, response: null };
      },
    },
    "@/app/lib/db": {
      getClient: async () => client,
      query: async (sql, params) => {
        calls.push({ sql, params });
        return { rows: [{ id: 12, estado_registro: "pendiente" }] };
      },
    },
  };
  return {
    route: load("app/api/solicitudes/cuentas/[id]/route.ts", mocks),
    list: load("app/api/solicitudes/cuentas/route.ts", mocks),
    calls,
    released: () => released,
  };
}
test("bandeja de cuentas exige administración y consulta el estado de registro sin confundir cuentas desactivadas", async () => {
  const allowed = setup();
  assert.equal((await allowed.list.GET({})).status, 200);
  assert.ok(allowed.calls[0].sql.includes("estado_registro IS NOT NULL"));
  assert.ok(!allowed.calls[0].sql.includes("password"));
  const denied = setup({ denied: true });
  assert.equal((await denied.list.GET({})).status, 403);
  assert.equal(denied.calls.length, 0);
});
test("aprobar o rechazar una cuenta guarda acceso y aviso en la misma transacción; fallo revierte ambos", async () => {
  for (const estado of ["aprobada", "rechazada"])
    for (const fail of [false, true]) {
      const run = setup({ fail });
      const response = await run.route.PUT(
        { json: async () => ({ estado }) },
        { params: { id: "12" } },
      );
      assert.equal(response.status, fail ? 503 : 200);
      const update = run.calls.find((c) => c.sql.startsWith("UPDATE usuarios"));
      assert.equal(update.params[0], estado);
      assert.equal(update.params[1], estado === "aprobada");
      assert.ok(run.calls.some((c) => c.sql.includes("FOR UPDATE")));
      assert.equal(run.calls.at(-1).sql, fail ? "ROLLBACK" : "COMMIT");
      assert.ok(run.released());
    }
});
test("no procesa dos veces una solicitud ni permite decidir con un estado inválido", async () => {
  const resolved = setup({ state: "aprobada" });
  assert.equal(
    (
      await resolved.route.PUT(
        { json: async () => ({ estado: "rechazada" }) },
        { params: { id: "12" } },
      )
    ).status,
    409,
  );
  assert.equal(
    resolved.calls.some((c) => c.sql.startsWith("UPDATE usuarios")),
    false,
  );
  const invalid = setup();
  assert.equal(
    (
      await invalid.route.PUT(
        { json: async () => ({ estado: "pendiente" }) },
        { params: { id: "12" } },
      )
    ).status,
    400,
  );
  assert.equal(invalid.calls.length, 0);
});
