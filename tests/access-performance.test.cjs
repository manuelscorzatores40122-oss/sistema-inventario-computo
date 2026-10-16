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
      process: { env: { DATABASE_URL: "postgres://isolated-test" } },
      console: { error() {} },
      Date,
      SyntaxError,
      require(name) {
        if (name === "next/server")
          return {
            NextResponse: {
              json: (body, options) => ({
                body,
                status: options?.status || 200,
                cookies: { set() {} },
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
const slots = load("app/lib/school-slots.ts", {});
test("resúmenes usan una sola consulta, mantienen la identidad docente y restringen el panel a administración", async () => {
  for (const role of ["admin", "profesor"]) {
    const calls = [];
    const payload = {
      requests: [],
      loans: [],
      inventory: [],
      items: [],
      teachers: [],
      schedule: [],
      notifications: [],
      template_value: null,
    };
    const route = load(`app/api/${role}/resumen/route.ts`, {
      "@/app/lib/session": {
        requireSession: async (request, adminOnly) => {
          assert.equal(!!adminOnly, role === "admin");
          return { user: { id: 7, role }, response: null };
        },
      },
      "@/app/lib/db": {
        query: async (sql, params) => {
          calls.push({ sql, params });
          return { rows: [payload] };
        },
      },
      "@/app/lib/school-slots": slots,
    });
    const response = await route.GET({});
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.ok(response.body.template.length > 0);
    if (role === "profesor") {
      assert.equal(calls[0].params[0], 7);
      assert.ok(calls[0].sql.includes("s.profesor_id = $1"));
      assert.ok(calls[0].sql.includes("p.profesor_id = $1"));
      assert.equal(response.body.user.id, 7);
    }
  }
});
test("la plantilla dañada usa turnos válidos sin bloquear la carga", () => {
  assert.equal(slots.parseSchoolSlots("{malformed").length, 6);
  assert.equal(
    slots.parseSchoolSlots('[{"hora_inicio":"25:00","hora_fin":"26:00"}]')
      .length,
    6,
  );
});
test("login distingue cuenta pendiente, credenciales incorrectas y fallo temporal sin emitir sesión", async () => {
  for (const scenario of [
    "pending",
    "wrong",
    "database",
    "configuration",
    "success",
  ]) {
    const auth = {
      getUserByEmail: async () => {
        if (scenario === "database")
          throw Error("Connection terminated unexpectedly");
        return {
          id: 7,
          activo: scenario !== "pending",
          password: "hash",
          role: "profesor",
        };
      },
      comparePassword: async () => scenario !== "wrong",
      generateToken: () => {
        if (scenario === "configuration")
          throw Error("JWT_SECRET debe estar configurada");
        return "valid-token";
      },
    };
    const { POST } = load("app/api/auth/login/route.ts", {
      "@/app/lib/auth": auth,
    });
    const response = await POST({
      json: async () => ({ email: "90019001", password: "Secret_123" }),
    });
    assert.equal(
      response.status,
      scenario === "success"
        ? 200
        : ["pending", "wrong"].includes(scenario)
          ? 401
          : 503,
    );
    assert.equal(!!response.body.token, scenario === "success");
    if (scenario === "configuration")
      assert.equal(response.body.code, "AUTH_CONFIGURATION");
  }
});
test("login rechaza JSON inválido y campos vacíos antes de consultar la base", async () => {
  const { POST } = load("app/api/auth/login/route.ts", {
    "@/app/lib/auth": {},
  });
  assert.equal((await POST({ json: async () => null })).status, 400);
  assert.equal(
    (
      await POST({
        json: async () => {
          throw new SyntaxError("invalid");
        },
      })
    ).status,
    400,
  );
});

test("el pool instala una sola protección para conexiones ociosas y solo reintenta lecturas", async () => {
  let created = 0,
    listeners = 0,
    handler,
    calls = [];
  class FakePool {
    constructor() {
      created++;
    }
    on(event, callback) {
      assert.equal(event, "error");
      listeners++;
      handler = callback;
    }
    async query(sql) {
      calls.push(sql);
      if (calls.filter((s) => s === sql).length === 1) {
        const error = Error("Connection terminated unexpectedly");
        error.code = "57P01";
        throw error;
      }
      return { rows: [{ ok: true }] };
    }
  }
  const db = load("app/lib/db.ts", { pg: { Pool: FakePool } });
  db.initializePool();
  db.initializePool();
  assert.equal(created, 1);
  assert.equal(listeners, 1);
  assert.doesNotThrow(() => handler(Error("idle closed")));
  assert.equal((await db.query("SELECT 1")).rows[0].ok, true);
  assert.equal(calls.filter((s) => s === "SELECT 1").length, 2);
  await assert.rejects(() => db.query("UPDATE usuarios SET activo=true"));
  assert.equal(calls.filter((s) => s.startsWith("UPDATE")).length, 1);
});
