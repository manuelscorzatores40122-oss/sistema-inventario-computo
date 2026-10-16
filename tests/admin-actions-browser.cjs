/* Interfaz administrativa con API simulada: ninguna escritura llega a Neon. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("@next/env").loadEnvConfig(process.cwd());
const jwt = require("jsonwebtoken");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://localhost:3011";
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "America/Lima",
});
const user = {
  id: 9000,
  nombre: "Administración",
  apellido: "Colegio",
  role: "admin",
};
const teachers = [
  {
    id: 9001,
    nombre: "Ana",
    apellido: "Torres",
    activo: true,
    dni: "90019001",
  },
  {
    id: 9002,
    nombre: "Luis",
    apellido: "Pérez",
    activo: false,
    dni: "90029002",
  },
];
const requests = [
  {
    id: 101,
    profesor_nombre: "Ana",
    apellido: "Torres",
    item_nombre: "Proyector multimedia",
    cantidad_solicitada: 1,
    motivo: "Proyección de Ciencias",
    estado: "pendiente",
    fecha_solicitud: today,
  },
  {
    id: 102,
    profesor_nombre: "Ana",
    item_nombre: "Laptop",
    cantidad_solicitada: 1,
    motivo: "Trabajo de investigación",
    estado: "pendiente",
    fecha_solicitud: today,
  },
];
const loans = [
  {
    id: 201,
    profesor_nombre: "Ana",
    profesor_apellido: "Torres",
    item_nombre: "Laptop docente",
    cantidad: 1,
    estado: "pendiente",
    fecha_prestamo: today,
  },
  {
    id: 202,
    profesor_nombre: "Ana",
    item_nombre: "Parlante",
    cantidad: 1,
    estado: "prestado",
    fecha_prestamo: today,
  },
];
const inventory = [
  {
    id: 1,
    nombre: "Proyector multimedia",
    cantidad_disponible: 5,
    cantidad_total: 7,
    estado: "disponible",
  },
  {
    id: 2,
    nombre: "Laptop",
    cantidad_total: 10,
    cantidad_disponible: 0,
    estado: "mantenimiento",
  },
];
let schedule = [],
  template = [
    { hora_inicio: "08:00", hora_fin: "08:45" },
    { hora_inicio: "08:45", hora_fin: "09:30" },
  ];
const writes = [];
async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.TEST_BROWSER_CHANNEL || "msedge",
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "es-PE",
      reducedMotion: "reduce",
    });
    await context.addCookies([
      {
        name: "auth-token",
        value: jwt.sign(
          { userId: user.id, role: "admin" },
          process.env.JWT_SECRET,
          { expiresIn: "15m" },
        ),
        url: base,
        httpOnly: true,
      },
    ]);
    await context.addInitScript(
      (user) => localStorage.setItem("user", JSON.stringify(user)),
      user,
    );
    await context.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        method = req.method();
      let result = {};
      if (method === "GET") {
        if (url.pathname === "/api/admin/resumen")
          result = {
            requests,
            loans,
            teachers,
            items: inventory,
            schedule,
            template,
          };
        else if (url.pathname === "/api/solicitudes")
          result = { solicitudes: requests };
        else if (url.pathname === "/api/prestamos")
          result = { prestamos: loans };
        else if (url.pathname === "/api/usuarios")
          result = { usuarios: teachers };
        else if (url.pathname === "/api/inventario")
          result = { items: inventory };
        else if (url.pathname === "/api/disponibilidad")
          result = { disponibilidades: schedule };
        else if (url.pathname === "/api/horario/template")
          result = { template };
        else if (url.pathname.includes("notificaciones"))
          result = {
            keys: [],
            notificaciones: [],
            solicitudes: [],
            usuarios: [],
            prestamos: [],
          };
        else
          return route.fulfill({
            status: 500,
            body: JSON.stringify({ error: "GET no simulado " + url.pathname }),
            contentType: "application/json",
          });
      } else {
        const body = method === "DELETE" ? null : req.postDataJSON();
        writes.push({ path: url.pathname, method, body });
        const id = Number(url.pathname.split("/").at(-1));
        if (url.pathname.startsWith("/api/solicitudes/"))
          Object.assign(
            requests.find((r) => r.id === id),
            body,
          );
        else if (url.pathname.startsWith("/api/prestamos/"))
          Object.assign(
            loans.find((r) => r.id === id),
            body,
          );
        else if (url.pathname.startsWith("/api/usuarios/"))
          Object.assign(
            teachers.find((r) => r.id === id),
            body,
          );
        else if (url.pathname === "/api/horario/template")
          template = body.template;
        else if (url.pathname.startsWith("/api/disponibilidad")) {
          if (method === "POST")
            schedule.push({
              ...body,
              id: 501,
              reservado_por_nombre: "Ana",
              reservado_por_apellido: "Torres",
            });
          else if (method === "PUT")
            Object.assign(
              schedule.find((r) => r.id === id),
              body,
            );
          else schedule = schedule.filter((r) => r.id !== id);
        } else
          return route.fulfill({
            status: 500,
            body: JSON.stringify({
              error: "Escritura no simulada " + url.pathname,
            }),
            contentType: "application/json",
          });
        result = { message: "Guardado" };
      }
      await route.fulfill({
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
    await page.goto(base + "/admin/dashboard");
    await page
      .getByText("Proyector multimedia", { exact: true })
      .first()
      .waitFor();
    await page.screenshot({
      path: path.join(output, "admin-dashboard-tareas-1440.png"),
      fullPage: true,
    });
    const menu = page.getByRole("navigation", {
      name: "Menú de administración",
    });
    const color = await menu
      .getByRole("link", { name: "Inventario", exact: true })
      .evaluate((el) => getComputedStyle(el).color);
    assert.equal(color, "rgb(54, 89, 78)");
    await page
      .getByRole("button", { name: "Revisar", exact: true })
      .first()
      .click();
    await page
      .getByLabel("Respuesta para el docente (opcional)")
      .fill("Recoger en la sala");
    await page
      .getByRole("button", { name: "Aprobar solicitud", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(writes.at(-1).body.comentarios, "Recoger en la sala");
    assert.equal(requests[0].estado, "aprobada");
    await page
      .getByRole("button", { name: "Revisar", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Rechazar solicitud", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(requests[1].estado, "rechazada");
    await page
      .getByRole("button", { name: "Por entregar · 1", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar entrega", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirmar entrega", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(loans[0].estado, "prestado");
    await page.getByRole("button", { name: "En uso · 2", exact: true }).click();
    await page
      .getByRole("button", { name: "Registrar devolución", exact: true })
      .first()
      .click();
    await page
      .getByLabel("Estado del equipo al recibirlo")
      .selectOption("malo");
    await page
      .getByLabel("Observaciones de devolución (opcional)")
      .fill("Pantalla dañada");
    await page.getByRole("button", { name: "Guardar devolución" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(writes.at(-1).body.devolucion_estado, "malo");
    await page
      .getByRole("button", { name: "Cuentas inactivas · 1", exact: true })
      .click();
    await page.getByRole("button", { name: "Revisar cuenta" }).click();
    await page
      .getByRole("button", { name: "Activar cuenta", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(teachers[1].activo, true);
    await page.goto(base + "/admin/horario");
    await page
      .getByRole("button", { name: "Asignar turno", exact: true })
      .waitFor({ state: "visible" });
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(output, "admin-almanaque-1440.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Asignar turno", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.getByLabel("Docente").selectOption("9001");
    await page.getByLabel("Materia o actividad").fill("Ciencias · 3.º A");
    await page
      .getByRole("button", { name: "Guardar turno", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(schedule[0].es_recurrente, false);
    assert.equal(schedule[0].fecha_reserva, today);
    await page
      .getByRole("button", { name: "Editar turno", exact: true })
      .click();
    await page.getByLabel("Frecuencia").selectOption("weekly");
    await page.getByLabel("Materia o actividad").fill("Ciencias semanal");
    await page
      .getByRole("button", { name: "Guardar turno", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(schedule[0].es_recurrente, true);
    assert.equal(schedule[0].fecha_reserva, null);
    await page
      .getByRole("button", { name: "Asignar turno", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Guardar turno", exact: true })
        .isDisabled(),
      true,
    );
    await page
      .getByRole("button", { name: "08:45 – 09:30", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Guardar turno", exact: true })
        .isEnabled(),
      true,
    );
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(output, "admin-almanaque-390.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Editar turno", exact: true })
      .click();
    await page.screenshot({
      path: path.join(output, "admin-formulario-turno-390.png"),
      fullPage: true,
    });
    assert.ok(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page
      .getByRole("button", { name: "Liberar turno", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirmar liberación" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(schedule.length, 0);
    await page
      .getByRole("button", { name: "Configurar turnos", exact: true })
      .click();
    await page.getByRole("button", { name: "Añadir turno" }).click();
    await page.getByLabel("Fin 3", { exact: true }).fill("10:15");
    await page.getByRole("button", { name: "Guardar configuración" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(template.length, 3);
    assert.deepEqual(errors, []);
    console.log(
      "Administrador: aprobación, rechazo, entrega, devolución, cuenta, reserva puntual/semanal, edición, conflicto, liberación y plantilla verificados con API aislada.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
