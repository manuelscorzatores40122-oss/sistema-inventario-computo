/* Recorre el alta y acceso con SQL real dentro de una transacción que siempre se revierte. */
const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path"),
  ts = require("typescript");
const assert = require("node:assert/strict");
require("@next/env").loadEnvConfig(process.cwd());
const { Pool } = require("pg");
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const admin = (
      await client.query(
        "SELECT id,role FROM usuarios WHERE role='admin' AND activo=true LIMIT 1",
      )
    ).rows[0];
    assert.ok(admin);
    let dni;
    for (let i = 0; i < 20; i++) {
      const candidate = String(90000000 + Math.floor(Math.random() * 9999999));
      if (
        !(
          await client.query(
            "SELECT id FROM usuarios WHERE dni=$1 OR email=$1",
            [candidate],
          )
        ).rows.length
      ) {
        dni = candidate;
        break;
      }
    }
    assert.ok(dni);
    const cache = new Map();
    const wrapped = {
      query: async (sql, params) => {
        if (sql === "BEGIN") return client.query("SAVEPOINT account_flow");
        if (sql === "COMMIT")
          return client.query("RELEASE SAVEPOINT account_flow");
        if (sql === "ROLLBACK") {
          await client.query("ROLLBACK TO SAVEPOINT account_flow");
          return client.query("RELEASE SAVEPOINT account_flow");
        }
        return client.query(sql, params);
      },
      release() {},
    };
    const db = {
      query: (sql, params) => client.query(sql, params),
      getClient: async () => wrapped,
    };
    function load(file) {
      file = path.resolve(file);
      if (cache.has(file)) return cache.get(file);
      const exports = {};
      cache.set(file, exports);
      vm.runInNewContext(
        ts.transpileModule(fs.readFileSync(file, "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            esModuleInterop: true,
          },
        }).outputText,
        {
          exports,
          process,
          console,
          Buffer,
          Date,
          Intl,
          URL,
          setTimeout,
          clearTimeout,
          require(name) {
            if (name === "@/app/lib/db" || name === "./db") return db;
            if (name.startsWith("@/")) return load(name.slice(2) + ".ts");
            if (name.startsWith("."))
              return load(path.resolve(path.dirname(file), name) + ".ts");
            return require(name);
          },
        },
        { filename: file },
      );
      return exports;
    }
    const auth = load("app/lib/auth.ts");
    const registration = load("app/api/auth/register/route.ts");
    const login = load("app/api/auth/login/route.ts");
    const users = load("app/api/usuarios/[id]/route.ts");
    const { NextRequest } = require("next/server");
    const request = (route, body, token) =>
      new NextRequest("http://localhost:3011" + route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { cookie: "auth-token=" + token } : {}),
        },
        body: JSON.stringify(body),
      });
    const password = "CuentaPrueba_2026!";
    const start = performance.now();
    let response = await registration.POST(
      request("/api/auth/register", {
        dni,
        nombre: "Prueba temporal",
        apellido: "Verificación",
        password,
        area: "QA",
      }),
    );
    let data = await response.json();
    assert.equal(response.status, 201, JSON.stringify(data));
    const id = data.user.id;
    console.log("Solicitud de cuenta: 201, inactiva.");
    response = await login.POST(
      request("/api/auth/login", { email: dni, password }),
    );
    assert.equal(response.status, 401);
    console.log("Acceso previo a aprobación: bloqueado correctamente.");
    response = await users.PUT(
      request(
        "/api/usuarios/" + id,
        { activo: true },
        auth.generateToken(admin.id, "admin"),
      ),
      { params: { id: String(id) } },
    );
    data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    console.log("Activación administrativa: 200.");
    response = await login.POST(
      request("/api/auth/login", { email: dni, password }),
    );
    data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    assert.equal(data.user.id, id);
    assert.ok(data.token);
    console.log(
      "Inicio de sesión de la cuenta nueva: 200, cookie y token generados. Flujo " +
        Math.round(performance.now() - start) +
        " ms.",
    );
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
    console.log("Prueba revertida: no se conserva la cuenta ni sus avisos.");
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
