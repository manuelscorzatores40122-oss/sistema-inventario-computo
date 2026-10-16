/* Prueba HTTP local explícita: crea una cuenta temporal y elimina únicamente sus registros al terminar. */
require("@next/env").loadEnvConfig(process.cwd());
const { Pool } = require("pg"),
  jwt = require("jsonwebtoken"),
  assert = require("node:assert/strict"),
  { randomBytes } = require("node:crypto");
async function main() {
  if (process.env.RUN_ACCOUNT_HTTP_TEST !== "1")
    throw Error("Esta prueba requiere RUN_ACCOUNT_HTTP_TEST=1.");
  const base = process.env.TEST_BASE_URL || "http://localhost:3011";
  if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))
    throw Error("Esta prueba solo admite un servidor local.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let id, dni;
  try {
    const admin = (
      await pool.query(
        "SELECT id FROM usuarios WHERE role='admin' AND activo=true ORDER BY id LIMIT 1",
      )
    ).rows[0];
    assert.ok(admin);
    for (let i = 0; i < 20; i++) {
      const candidate = String(90000000 + Math.floor(Math.random() * 9999999));
      if (
        !(
          await pool.query("SELECT id FROM usuarios WHERE dni=$1 OR email=$1", [
            candidate,
          ])
        ).rows.length
      ) {
        dni = candidate;
        break;
      }
    }
    assert.ok(dni);
    const password = randomBytes(18).toString("base64url");
    const send = async (url, body, cookie) => {
      const r = await fetch(base + url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify(body),
      });
      return { response: r, body: await r.json() };
    };
    let result = await send("/api/auth/register", {
      dni,
      nombre: "Prueba temporal HTTP",
      apellido: "Verificación de acceso",
      password,
      area: "QA temporal",
    });
    assert.equal(result.response.status, 201, JSON.stringify(result.body));
    id = result.body.user.id;
    console.log("HTTP solicitud: 201.");
    result = await send("/api/auth/login", { email: dni, password });
    assert.equal(result.response.status, 401, JSON.stringify(result.body));
    const adminCookie =
      "auth-token=" +
      jwt.sign({ userId: admin.id, role: "admin" }, process.env.JWT_SECRET, {
        expiresIn: "5m",
      });
    let response = await fetch(base + "/api/usuarios/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ activo: true }),
    });
    let body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    console.log("HTTP aprobación: 200.");
    result = await send("/api/auth/login", { email: dni, password });
    assert.equal(result.response.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.user.id, id);
    assert.ok(result.response.headers.get("set-cookie")?.includes("HttpOnly"));
    console.log("HTTP inicio de sesión: 200, cookie HttpOnly.");
    const cookie = "auth-token=" + result.body.token;
    response = await fetch(base + "/profesor/dashboard", {
      headers: { cookie },
      redirect: "manual",
    });
    assert.equal(response.status, 200);
    console.log("HTTP página de profesor: 200.");
    response = await fetch(base + "/api/profesor/resumen", {
      headers: { cookie },
    });
    body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.user.id, id);
    console.log("HTTP datos de cuenta nueva: 200, identidad correcta.");
  } finally {
    if (!id && dni) {
      const r = await pool.query(
        "SELECT id FROM usuarios WHERE dni=$1 AND nombre='Prueba temporal HTTP' AND apellido='Verificación de acceso'",
        [dni],
      );
      id = r.rows[0]?.id;
    }
    if (id) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const verified = await client.query(
          "SELECT id FROM usuarios WHERE id=$1 AND dni=$2 AND nombre='Prueba temporal HTTP' AND apellido='Verificación de acceso' FOR UPDATE",
          [id, dni],
        );
        assert.equal(verified.rows.length, 1);
        await client.query(
          "DELETE FROM notificaciones_whatsapp WHERE usuario_id=$1 OR (tipo='registro_profesor' AND referencia_id=$1)",
          [id],
        );
        await client.query(
          "DELETE FROM notificaciones_lecturas WHERE usuario_id=$1",
          [id],
        );
        await client.query("DELETE FROM usuarios WHERE id=$1 AND dni=$2", [
          id,
          dni,
        ]);
        await client.query("COMMIT");
        console.log("Cuenta temporal y sus avisos retirados.");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
