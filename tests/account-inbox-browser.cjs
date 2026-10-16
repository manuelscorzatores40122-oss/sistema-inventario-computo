/* Bandeja administrativa con API aislada. No modifica cuentas reales. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
require("@next/env").loadEnvConfig(process.cwd());
const jwt = require("jsonwebtoken");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = "http://localhost:3011";
async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.TEST_BROWSER_CHANNEL || "msedge",
  });
  try {
    const user = { id: 9000, role: "admin", nombre: "Administración" };
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "es-PE",
    });
    await context.addCookies([
      {
        name: "auth-token",
        value: jwt.sign(
          { userId: user.id, role: "admin" },
          process.env.JWT_SECRET,
          { expiresIn: "10m" },
        ),
        url: base,
        httpOnly: true,
      },
    ]);
    await context.addInitScript(
      (user) => localStorage.setItem("user", JSON.stringify(user)),
      user,
    );
    const accounts = [
      {
        id: 9001,
        nombre: "Ana",
        apellido: "Torres",
        dni: "90019001",
        estado_registro: "pendiente",
        area: "Matemática",
        telefono: null,
        correo_personal: null,
        fecha_creacion: new Date().toISOString(),
      },
      {
        id: 9002,
        nombre: "Luis",
        apellido: "Pérez",
        dni: "90029002",
        estado_registro: "pendiente",
        area: "Ciencias",
        fecha_creacion: new Date().toISOString(),
      },
    ];
    let fail = true;
    const decisions = [];
    await context.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      let result = {};
      if (url.pathname === "/api/solicitudes/cuentas" && req.method() === "GET")
        result = { cuentas: accounts };
      else if (
        url.pathname.startsWith("/api/solicitudes/cuentas/") &&
        req.method() === "PUT"
      ) {
        if (fail) {
          fail = false;
          return route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              error: "Fallo temporal de prueba. Intenta nuevamente.",
            }),
          });
        }
        const body = req.postDataJSON(),
          id = Number(url.pathname.split("/").at(-1));
        Object.assign(
          accounts.find((r) => r.id === id),
          { estado_registro: body.estado },
        );
        decisions.push({ id, ...body });
        result = {
          message:
            body.estado === "aprobada"
              ? "Cuenta aprobada. El docente ya puede iniciar sesión."
              : "Solicitud de cuenta rechazada.",
        };
      } else if (url.pathname === "/api/solicitudes")
        result = { solicitudes: [] };
      else if (url.pathname.includes("notificaciones"))
        result = {
          solicitudes: [],
          usuarios: [],
          prestamos: [],
          notificaciones: [],
          keys: [],
        };
      else
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "API no simulada " + url.pathname }),
        });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const output = process.env.TEST_SCREENSHOTS || "test-results";
    fs.mkdirSync(output, { recursive: true });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + "/admin/solicitudes");
      await page
        .getByRole("heading", { name: "Ana Torres", exact: true })
        .waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      if (width !== 320)
        await page.screenshot({
          path: path.join(output, `solicitudes-cuentas-${width}.png`),
          fullPage: true,
        });
    }
    await page
      .getByRole("button", {
        name: "Aprobar cuenta de Ana Torres",
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Confirmar aprobación" }).click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(decisions.length, 0);
    await dialog.getByRole("button", { name: "Confirmar aprobación" }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(decisions[0].estado, "aprobada");
    await page
      .getByRole("heading", { name: "Ana Torres", exact: true })
      .waitFor({ state: "hidden" });
    await page
      .getByRole("button", {
        name: "Rechazar cuenta de Luis Pérez",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "Confirmar rechazo" }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(decisions[1].estado, "rechazada");
    await page
      .getByRole("heading", { name: "No hay cuentas pendientes de revisión" })
      .waitFor();
    await page.getByRole("button", { name: /Cuentas revisadas/ }).click();
    await page
      .getByRole("heading", { name: "Ana Torres", exact: true })
      .waitFor();
    await page
      .getByRole("heading", { name: "Luis Pérez", exact: true })
      .waitFor();
    assert.ok(
      await page.getByText("CUENTA APROBADA", { exact: true }).isVisible(),
    );
    assert.ok(
      await page.getByText("SOLICITUD RECHAZADA", { exact: true }).isVisible(),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Bandeja de Solicitudes: cuentas visibles a 1440/390/320 px, reintento tras fallo, aprobación, rechazo e historial correctos. API aislada.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
