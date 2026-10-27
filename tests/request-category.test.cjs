const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, Date, Intl, require(name) {
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      if (name === 'next/link') return { default: ({ href, children }) => React.createElement('a', { href }, children) };
      if (name === 'react-icons/fi') return new Proxy({}, { get: () => () => null });
      if (name.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
      if (name in mocks) return mocks[name];
      throw Error(name);
    },
  });
  return exports;
}
const categories = load('app/lib/request-category.ts');

test('distingue reservas de sala y equipos por sus referencias, sin depender del nombre del artículo', () => {
  assert.equal(categories.requestCategory({ inventario_id: 5, disponibilidad_id: null, item_nombre: 'Equipo para aula' }), 'equipos');
  assert.equal(categories.requestCategory({ inventario_id: null, disponibilidad_id: 8, item_nombre: 'Clase' }), 'aula');
  assert.equal(categories.requestCategory({ inventario_id: null, disponibilidad_id: null }), 'aula');
});

test('cada grupo conserva sus estados sin mezclar solicitudes ni contadores', () => {
  const rows = [
    { id:1, inventario_id:5, disponibilidad_id:null, estado:'pendiente' },
    { id:2, inventario_id:null, disponibilidad_id:8, estado:'pendiente' },
    { id:3, inventario_id:6, disponibilidad_id:null, estado:'aprobada' },
    { id:4, inventario_id:null, disponibilidad_id:9, estado:'cancelada' },
  ];
  const rooms = rows.filter(row => categories.requestCategory(row) === 'aula');
  const equipment = rows.filter(row => categories.requestCategory(row) === 'equipos');
  assert.deepEqual(rooms.map(row => row.id), [2,4]);
  assert.deepEqual(equipment.map(row => row.id), [1,3]);
  assert.equal(rooms.filter(row => row.estado === 'aprobada').length, 0);
  assert.equal(equipment.filter(row => row.estado === 'aprobada').length, 1);
});

test('la vista docente muestra las dos categorías y solo las tarjetas del grupo seleccionado', () => {
  const rows = [
    { id:1, inventario_id:5, disponibilidad_id:null, estado:'pendiente', item_nombre:'Proyector del laboratorio', fecha_solicitud:'2026-10-27T12:00:00Z', motivo:'Clase' },
    { id:2, inventario_id:null, disponibilidad_id:8, estado:'aprobada', item_nombre:'Reserva especial de computación', fecha_solicitud:'2026-10-27T12:00:00Z', fecha_reserva:'2026-10-28', hora_inicio:'10:00', hora_fin:'11:00', motivo:'Clase' },
  ];
  const Component = load('app/components/teacher/TeacherRequests.tsx', {
    '@/app/lib/request-category': categories,
    '@/app/lib/teacher-utils': load('app/lib/teacher-utils.ts'),
    '@/app/lib/time-label': load('app/lib/time-label.ts'),
    './TeacherContext': { useTeacher: () => ({ data: { requests: rows, loans: [] }, refresh() {} }) },
    './TeacherUi': {
      DataBoundary: ({ children }) => React.createElement(React.Fragment, null, children),
      PageHeading: () => null, RefreshButton: () => null, Pagination: () => null,
      Status: ({ value }) => React.createElement('span', null, value),
    },
  }).default;
  const html = renderToStaticMarkup(React.createElement(Component));
  assert.ok(html.includes('Tipo de solicitud') && html.includes('Sala de cómputo') && html.includes('Equipos'));
  assert.ok(html.includes('Reserva especial de computación'));
  assert.ok(!html.includes('Proyector del laboratorio'));
  assert.ok(html.includes('Mis préstamos'));
});
