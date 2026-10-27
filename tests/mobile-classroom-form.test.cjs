const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function form(schedule = [], slot = {}, now) {
  const Clock = now === undefined ? Date : class extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
  const utils = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/teacher-utils.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: utils, Date: Clock, Intl });
  const timeInput = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/components/teacher/Time12Input.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports: timeInput, require });
  const labels = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/time-label.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: labels });
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/components/teacher/MobileClassroomBookingForm.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, Date: Clock, require(name) {
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    if (name === './Time12Input') return timeInput;
    if (name === '@/app/lib/time-label') return labels;
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
  assert.ok(html.includes('id="mobile-reserve-start"') && html.includes('id="mobile-reserve-end"'));
  assert.equal((html.match(/<select/g) || []).length, 8);
  const gradeOptions = html.match(/<select[^>]*id="mobile-reserve-grade"[^>]*>([\s\S]*?)<\/select>/)[1];
  const sectionOptions = html.match(/<select[^>]*id="mobile-reserve-section"[^>]*>([\s\S]*?)<\/select>/)[1];
  for (const grade of [1, 2, 3, 4, 5]) assert.ok(gradeOptions.includes(`value="${grade}"`));
  assert.ok(!gradeOptions.includes('value="6"') && !sectionOptions.includes('value="C"'));
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


test('hoy bloquea horas y minutos anteriores a la hora de Lima y muestra la primera hora posible', () => {
  const html = form([], { date: '2026-10-27', start: '09:50', end: '10:30' }, Date.parse('2026-10-27T09:48:30-05:00'));
  const hour = html.match(/<select[^>]*id="mobile-reserve-start"[^>]*>([\s\S]*?)<\/select>/)[1];
  const minutes = html.match(/<select[^>]*aria-label="Minutos de inicio"[^>]*>([\s\S]*?)<\/select>/)[1];
  assert.ok(/<option[^>]*value="8"[^>]*disabled/.test(hour));
  assert.ok(/<option[^>]*value="48"[^>]*disabled/.test(minutes));
  assert.ok(!/<option[^>]*value="49"[^>]*disabled/.test(minutes));
  assert.ok(html.includes('9:49 a. m.'));
  assert.ok(!submitDisabled(html));
});

test('una hora que acaba de pasar deja de permitir el envío', () => {
  const slot = { date: '2026-10-27', start: '09:50', end: '10:30' };
  assert.ok(!submitDisabled(form([], slot, Date.parse('2026-10-27T09:49:30-05:00'))));
  assert.ok(submitDisabled(form([], slot, Date.parse('2026-10-27T09:50:00-05:00'))));
});

test('para mañana permite las horas de la mañana aunque hoy ya hayan pasado', () => {
  const html = form([], { date: '2026-10-28', start: '08:30', end: '09:30' }, Date.parse('2026-10-27T15:00:00-05:00'));
  assert.ok(!submitDisabled(html));
});
