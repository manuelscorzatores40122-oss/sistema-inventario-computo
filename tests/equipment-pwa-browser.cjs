/* Browser checks with simulated API: never writes to the database. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const jwt = require('jsonwebtoken');
require('@next/env').loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL || 'http://localhost:3011';
const items = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1, nombre: `Equipo ${String(i + 1).padStart(2, '0')}`, categoria: 'Computadoras',
  marca: 'Marca de prueba', codigo_patrimonial: `CP-${i + 1}`, numero_serie: `SERIE-${i + 1}`,
  cantidad_total: 3, cantidad_disponible: 2, estado: 'disponible',
  condicion: ['bueno', 'regular', 'malo', null][i % 4], ubicacion: 'Sala de cómputo',
}));

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.addCookies([{ name: 'auth-token', value: jwt.sign({ userId: 9000, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '15m' }), url: base }]);
    await context.addInitScript(() => localStorage.setItem('user', JSON.stringify({ id: 9000, role: 'admin', nombre: 'Prueba', apellido: 'Visual' })));
    await context.route('**/api/**', route => {
      assert.equal(route.request().method(), 'GET', 'No database writes allowed');
      return route.fulfill({ json: route.request().url().includes('/api/inventario') ? { items } : { notificaciones: [], keys: [], solicitudes: [], usuarios: [], prestamos: [] } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/admin/inventario`);
    const rows = page.locator('.inventory-equipment-table tbody tr');
    await page.getByText('Equipo 01', { exact: true }).waitFor();
    assert.equal(await rows.count(), 20);
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await page.getByText('Equipo 25', { exact: true }).waitFor();
    assert.equal(await rows.count(), 5);
    await page.getByRole('textbox', { name: 'Buscar equipos' }).fill('SERIE-25');
    await page.waitForFunction(() => document.querySelectorAll('.inventory-equipment-table tbody tr').length === 1);
    assert.match(await rows.innerText(), /Equipo 25/);
    await page.getByRole('textbox', { name: 'Buscar equipos' }).fill('');
    await page.getByText('Equipo 01', { exact: true }).waitFor();
    assert.equal(await rows.count(), 20);
    for (const width of [1280, 1024, 390, 320]) {
      await page.setViewportSize({ width, height: 740 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page overflow at ${width}`);
      if (width === 390) await page.screenshot({ path: 'test-results/equipment-refined-390.png' });
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({ path: 'test-results/equipment-refined-1280.png', fullPage: true });
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      event.prompt = async () => { window.installTriggered = true; };
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });
    await page.getByRole('button', { name: 'Instalar aplicación', exact: true }).click();
    assert(await page.evaluate(() => window.installTriggered));
    await page.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, value: false }); window.dispatchEvent(new Event('offline')); });
    await page.getByText('Sin conexión', { exact: true }).waitFor();
    await page.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); window.dispatchEvent(new Event('online')); });
    await page.getByText('Sin conexión', { exact: true }).waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
    await context.close();

    if (process.env.TEST_PWA_PRODUCTION === '1') {
      const offlineContext = await browser.newContext();
      const offlinePage = await offlineContext.newPage();
      await offlinePage.goto(`${base}/auth/login`);
      await offlinePage.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
      });
      const cached = await offlinePage.evaluate(async () => (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(request => new URL(request.url).pathname)))).flat());
      assert.deepEqual(cached, ['/offline.html'], 'No authenticated pages or API responses may be cached');
      const manifest = await (await offlineContext.request.get(`${base}/manifest.json`)).json();
      for (const icon of manifest.icons) {
        const response = await offlineContext.request.get(`${base}${icon.src}`);
        const png = await response.body();
        const [width, height] = icon.sizes.split('x').map(Number);
        assert.equal(png.readUInt32BE(16), width);
        assert.equal(png.readUInt32BE(20), height);
      }
      await offlineContext.setOffline(true);
      await offlinePage.goto(`${base}/admin/inventario`);
      await offlinePage.getByRole('heading', { name: 'No hay conexión a internet' }).waitFor();
      await offlineContext.setOffline(false);
      await offlinePage.getByRole('link', { name: 'Volver a intentar' }).click();
      await offlinePage.waitForURL('**/auth/login');
      await offlineContext.close();
    }
    console.log('PASS: equipment pagination/search, 4 viewport sizes, install prompt and connectivity' + (process.env.TEST_PWA_PRODUCTION === '1' ? ', real production service worker/offline recovery/icons/private-cache isolation' : ''));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
