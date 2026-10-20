/* Solo lecturas; se bloquean todas las escrituras a la aplicación. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
require('@next/env').loadEnvConfig(process.cwd());
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3011';
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let browser;
  try {
    const result = await pool.query("SELECT id, role, nombre, apellido FROM usuarios WHERE activo=true AND role='admin' ORDER BY id LIMIT 1");
    assert.ok(result.rows[0], 'Se requiere una cuenta administrativa activa para verificar lecturas.');
    const user = result.rows[0];
    browser = await chromium.launch({ headless: true, ...(process.env.TEST_BROWSER_CHANNEL ? { channel: process.env.TEST_BROWSER_CHANNEL } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', locale: 'es-PE' });
    await context.addCookies([{ name: 'auth-token', value: jwt.sign({ userId: user.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '15m' }), url: base, httpOnly: true }]);
    await context.addInitScript(user => localStorage.setItem('user', JSON.stringify(user)), user);
    await context.route('**/api/**', async route => {
      if (route.request().method() !== 'GET') return route.fulfill({ status: 403, body: JSON.stringify({ error: 'Escritura bloqueada durante prueba visual.' }), contentType: 'application/json' });
      if (route.request().url().includes('/api/notificaciones')) return route.fulfill({ body: JSON.stringify({ solicitudes: [], usuarios: [], prestamos: [], notificaciones: [] }), contentType: 'application/json' });
      return route.continue();
    });
    const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    const output = process.env.TEST_SCREENSHOTS || path.join(process.cwd(), 'test-results'); fs.mkdirSync(output, { recursive: true });
    for (const width of [1440, 1366, 1280, 1100, 1024, 992, 991, 820, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width >= 768 ? 600 : 740 });
      for (const view of ['dashboard', 'inventario', 'solicitudes', 'prestamos', 'profesores', 'horario', 'historial', 'perfil']) {
        await page.goto(`${base}/admin/${view}`); await page.getByRole('heading', { level: 1 }).first().waitFor();
        await page.waitForLoadState('networkidle');
        const size = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        if (size[0] > size[1] + 1) {
          console.log(await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1; }).slice(0, 20).map(el => ({ tag: el.tagName, class: el.className, right: Math.round(el.getBoundingClientRect().right), width: Math.round(el.getBoundingClientRect().width) }))));
          await page.screenshot({ path: path.join(output, `overflow-${view}-${width}.png`), fullPage: true });
        }
        assert.ok(size[0] <= size[1] + 1, `Desborde admin/${view} a ${width}px: ${size}`);
        if (width !== 320) await page.screenshot({ path: path.join(output, `admin-${view}-${width}.png`), fullPage: true });
      }
    }
    await page.getByRole('button', { name: 'Más', exact: true }).click(); await page.getByRole('dialog').waitFor();
    await page.getByRole('dialog').getByRole('link', { name: 'Profesores', exact: true }).click();
    await page.waitForURL('**/admin/profesores');
    assert.ok(page.url().endsWith('/admin/profesores'));
    assert.deepEqual(errors, []);
    console.log('Administración: 88 combinaciones de ruta/ancho, sin desbordes ni errores de React; menú móvil completo correcto. Solo lecturas.');
  } finally { await browser?.close(); await pool.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
