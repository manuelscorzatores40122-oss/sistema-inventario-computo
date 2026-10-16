/* Comprueba consultas y tiempos HTTP con cuentas existentes; solo realiza lecturas. */
require("@next/env").loadEnvConfig(process.cwd());
const { Pool } = require("pg"),
  jwt = require("jsonwebtoken"),
  assert = require("node:assert/strict");
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const rows = (
      await pool.query(
        "SELECT DISTINCT ON (role) id, role FROM usuarios WHERE activo=true AND role IN ('admin','profesor') ORDER BY role,id",
      )
    ).rows;
    for (const user of rows) {
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "5m" },
      );
      const url =
        "http://localhost:3011/api/" +
        (user.role === "admin" ? "admin" : "profesor") +
        "/resumen";
      const samples = [];
      let bytes = 0;
      for (let i = 0; i < 4; i++) {
        const start = performance.now();
        const response = await fetch(url, {
          headers: { cookie: "auth-token=" + token },
        });
        const body = await response.text();
        assert.equal(response.status, 200, body);
        bytes = Buffer.byteLength(body);
        samples.push(Math.round(performance.now() - start));
        const data = JSON.parse(body);
        assert.ok(
          Array.isArray(data.requests) &&
            Array.isArray(data.loans) &&
            Array.isArray(data.schedule),
        );
        if (user.role === "profesor")
          assert.ok(data.requests.every((r) => r.profesor_id === user.id));
      }
      console.log(
        user.role +
          ": HTTP 200; primera carga " +
          samples[0] +
          " ms; siguientes " +
          samples.slice(1).join(", ") +
          " ms; respuesta " +
          Math.round(bytes / 1024) +
          " KB.",
      );
    }
  } finally {
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
