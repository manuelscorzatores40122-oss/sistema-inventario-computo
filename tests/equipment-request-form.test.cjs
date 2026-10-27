const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function render(inventory) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/components/teacher/TeacherEquipment.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require(name) {
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    if (name === 'next/link') return { default: ({ children, href }) => React.createElement('a', { href }, children) };
    if (name === 'react-icons/fi') return new Proxy({}, { get: () => () => null });
    if (name === '@/app/lib/teacher-utils') return { normalize: value => value.toLowerCase() };
    if (name === './TeacherContext') return { useTeacher: () => ({ data: { inventory }, refresh() {} }) };
    if (name === './TeacherUi') return {
      DataBoundary: ({ children }) => React.createElement(React.Fragment, null, children),
      PageHeading: () => null, Pagination: () => null, RefreshButton: () => null,
      EmptyState: ({ title, children }) => React.createElement('div', null, title, children),
    };
    if (name.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
    throw Error(name);
  } });
  return renderToStaticMarkup(React.createElement(exports.default));
}

test('sin elegir un artículo muestra el catálogo sin el formulario Tu solicitud', () => {
  const html = render([{ id: 1, nombre: 'Proyector', categoria: 'Proyección', cantidad_disponible: 2, estado: 'disponible' }]);
  assert.ok(html.includes('Seleccionar Proyector'));
  assert.ok(!html.includes('Tu solicitud'));
  assert.ok(!html.includes('<form') && !html.includes('equipment-request'));
});

test('si el inventario está vacío tampoco muestra un formulario deshabilitado', () => {
  const html = render([]);
  assert.ok(html.includes('No hay equipos disponibles'));
  assert.ok(!html.includes('<form') && !html.includes('Tu solicitud'));
});
