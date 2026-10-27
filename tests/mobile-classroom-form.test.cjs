const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function form(schedule = [], slot = {}) {
  const utils = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/teacher-utils.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: utils, Date, Intl });
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/components/teacher/MobileClassroomBookingForm.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require(name) {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-icons/fi') return { FiSend: () => null };
    if (name === '@/app/lib/teacher-utils') return utils;
    if (name === './TeacherContext') return { useTeacher: () => ({ data: { schedule, user: { id: 3 } } }) };
    if (name === './TeacherUi') return { Notice: ({ children }) => React.createElement('div', { role: 'alert' }, children) };
    if (name.endsWith('.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
    throw Error(name);
  } });
  return renderToStaticMarkup(React.createElement(exports.default, {
    slot: { date: '2099-10-20', start: '09:10', end: '10:25', grade: '3', section: 'B', ...slot },
    setSlot() {}, reason: 'Clase de ciencias', setReason() {}, busy: false, error: '', onSubmit() {}, onClose() {},
  }));
}

function submitDisabled(html) { return /\sdisabled(?:=|\s|>)/.test(html.match(/<button\b[^>]*type="submit"[^>]*>/)[0]); }

test('el formulario móvil presenta fecha, horas exactas, grados 1 a 5, secciones A/B y mensaje sin un segundo calendario', () => {
  const html = form();
  assert.equal((html.match(/type="date"/g) || []).length, 1);
  assert.equal((html.match(/type="time"/g) || []).length, 2);
  assert.equal((html.match(/<select/g) || []).length, 2);
  for (const grade of [1, 2, 3, 4, 5]) assert.ok(html.includes(`value="${grade}"`));
  assert.ok(!html.includes('value="6"') && !html.includes('value="C"'));
  assert.ok(html.includes('<textarea') && !html.includes('Mes siguiente'));
  assert.ok(!submitDisabled(html));
});

test('al cruzarse con una reserva muestra al docente y bloquea el envío', () => {
  const html = form([{ id: 20, fecha_reserva: '2099-10-20', hora_inicio: '09:00', hora_fin: '10:00', estado: 'separado', reservado_por_nombre: 'Ana', reservado_por_apellido: 'Docente', motivo_reserva: '4.º A' }]);
  assert.ok(html.includes('Ana Docente'));
  assert.ok(html.includes('Ese horario está ocupado'));
  assert.ok(submitDisabled(html));
});

test('sin grado o sección el formulario impide enviar una solicitud incompleta', () => {
  assert.ok(submitDisabled(form([], { grade: '' })));
  assert.ok(submitDisabled(form([], { section: '' })));
});
