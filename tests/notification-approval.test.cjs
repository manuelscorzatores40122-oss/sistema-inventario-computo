const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, Date, Intl, require(name) {
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    if (name === 'next/link') return { default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (name === 'react-icons/fi') return new Proxy({}, { get: () => () => null });
    if (name.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
    if (name in mocks) return mocks[name];
    throw Error(name);
  } });
  return exports;
}
const presentation = load('app/lib/notification-presentation.ts');
const approved = (id, seconds = id) => presentation.presentNotification({ id, tipo: 'solicitud_aprobada', mensaje: `Administración aprobó tu solicitud #${id} de sala de cómputo.`, referencia_id: id, fecha_envio: `2026-10-27T15:00:${String(seconds).padStart(2, '0')}Z` }, false);

test('la aprobación conserva su tipo y enlaza la solicitud para mostrar un aviso explícito', () => {
  const item = approved(7);
  assert.equal(item.notificationType, 'solicitud_aprobada');
  assert.equal(item.title, 'Tu solicitud fue aprobada');
  assert.equal(item.href, '/profesor/solicitudes?solicitud=7');
});

test('las respuestas recibidas juntas se conservan en orden y no se repiten en la siguiente consulta', () => {
  const seen = new Set(['db-1']);
  const fresh = presentation.newInboxItems([approved(3), approved(2), approved(1)], seen);
  assert.deepEqual(Array.from(fresh, item => item.key), ['db-2', 'db-3']);
  assert.equal(presentation.newInboxItems([approved(3), approved(2), approved(1)], seen).length, 0);
});

test('en celular la aprobación tiene prioridad sobre otro aviso y los demás se conservan', () => {
  const other = { ...approved(1), notificationType: 'prestamo_registrado' };
  const queue = [other, approved(2), approved(3)];
  assert.equal(presentation.activeInboxItem(queue, false).key, 'db-1');
  assert.equal(presentation.activeInboxItem(queue, true).key, 'db-2');
  const remaining = queue.filter(item => item.key !== 'db-2');
  assert.equal(presentation.activeInboxItem(remaining, true).key, 'db-3');
  assert.equal(remaining.length, 2);
});

test('el aviso móvil es una ventana accesible con aprobación, detalle y confirmación explícita', () => {
  const Component = load('app/components/MobileApprovalNotice.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Component, { item: approved(7), remaining: 1, onAcknowledge() {} }));
  assert.ok(html.includes('role="alertdialog"'));
  assert.ok(html.includes('Tu solicitud fue aprobada'));
  assert.ok(html.includes('Administración aprobó tu solicitud #7'));
  assert.ok(html.includes('Entendido'));
  assert.ok(html.includes('href="/profesor/solicitudes?solicitud=7"'));
  assert.ok(html.includes('1 aviso más'));
});

test('Mis solicitudes conserva la búsqueda y ya no ofrece Exportar CSV', () => {
  const ui = { DataBoundary: ({ children }) => React.createElement(React.Fragment, null, children), EmptyState: ({ title }) => React.createElement('p', null, title), PageHeading: () => null, RefreshButton: () => null, Pagination: () => null };
  const Component = load('app/components/teacher/TeacherRequests.tsx', {
    '@/app/lib/time-label': { timeLabel: () => '' },
    '@/app/lib/teacher-utils': load('app/lib/teacher-utils.ts'),
    '@/app/lib/request-category': load('app/lib/request-category.ts'),
    './TeacherContext': { useTeacher: () => ({ data: { requests: [], loans: [] }, refresh() {} }) },
    './TeacherUi': ui,
  }).default;
  const html = renderToStaticMarkup(React.createElement(Component));
  assert.ok(html.includes('Buscar en mi actividad'));
  assert.ok(html.includes('Mis solicitudes'));
  assert.ok(!html.includes('Exportar CSV'));
});


test('las notificaciones de nuevas cuentas abren la bandeja dentro de Profesores y cuentas', () => {
  const item = presentation.presentNotification({ id:9, tipo:'registro_profesor', mensaje:'Un docente solicita acceso.', referencia_id:12, fecha_envio:'2026-10-27T15:00:00Z' }, true);
  assert.equal(item.href, '/admin/profesores/cuentas');
});

test('la navegación entre directorio y solicitudes destaca la vista correspondiente', () => {
  for (const path of ['/admin/profesores', '/admin/profesores/cuentas']) {
    const Component = load('app/components/admin/TeacherManagementTabs.tsx', { 'next/navigation': { usePathname: () => path } }).default;
    const html = renderToStaticMarkup(React.createElement(Component));
    assert.ok(html.includes('Directorio de profesores'));
    assert.ok(html.includes('Solicitudes de cuenta'));
    const active = html.match(new RegExp('<a[^>]*href="'+path+'"[^>]*>'))[0];
    assert.ok(active.includes('aria-current="page"'));
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  }
});
