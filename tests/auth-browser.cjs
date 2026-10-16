/* Valida mensajes públicos de acceso con API simulada. No crea cuentas reales. */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.TEST_BROWSER_CHANNEL || "msedge",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    let nonJson = false;
    await page.route("**/api/auth/**", async (route) => {
      if (nonJson)
        return route.fulfill({
          status: 503,
          contentType: "text/html",
          body: "<html>Unavailable</html>",
        });
      const url = new URL(route.request().url());
      return route.fulfill({
        status: url.pathname.endsWith("register") ? 201 : 401,
        contentType: "application/json",
        body: JSON.stringify(
          url.pathname.endsWith("register")
            ? { message: "Solicitud recibida", user: { id: 9001 } }
            : {
                error:
                  "Tu cuenta está pendiente de aprobación por el administrador del colegio.",
              },
        ),
      });
    });
    await page.goto("http://localhost:3011/auth/register");
    await page.getByLabel("Nombres", { exact: true }).fill("Ana");
    await page.getByLabel("Apellidos", { exact: true }).fill("Torres");
    await page.getByLabel("DNI (Usuario)", { exact: true }).fill("90019001");
    await page.getByLabel("Contraseña", { exact: true }).fill("Password_123");
    await page
      .getByRole("button", { name: "Solicitar Cuenta", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Solicitud enviada", exact: true })
      .waitFor();
    assert.ok(await page.getByRole("status").isVisible());
    await page
      .getByRole("link", { name: "Volver al inicio de sesión" })
      .click();
    await page.waitForURL("**/auth/login");
    await page.getByLabel("DNI (Usuario)", { exact: true }).fill("90019001");
    await page.getByLabel("Contraseña", { exact: true }).fill("Password_123");
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page.locator(".login-alert[role=alert]").waitFor();
    assert.ok(
      (await page.locator(".login-alert[role=alert]").innerText()).includes(
        "pendiente de aprobación",
      ),
    );
    nonJson = true;
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page
      .getByText(
        "El servidor no respondió correctamente. Intenta nuevamente en unos momentos.",
      )
      .waitFor();
    assert.equal(
      await page.getByLabel("DNI (Usuario)", { exact: true }).inputValue(),
      "90019001",
    );
    console.log(
      "Acceso móvil: solicitud enviada, vuelta al login, aviso de cuenta pendiente y errores sin borrar datos correctos.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
