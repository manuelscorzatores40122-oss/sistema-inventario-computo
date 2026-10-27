const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load({ broken = false, canvasError = false } = {}) {
  const exports = {};
  let canvas;
  class Reader { readAsDataURL() { this.result = 'data:image/png;base64,AA=='; this.onload(); } }
  class Picture { constructor() { this.width = 4000; this.height = 2000; } set src(value) { broken ? this.onerror() : this.onload(); } }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/imageUtils.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, FileReader: Reader, Image: Picture,
    document: { createElement() { canvas = { getContext: () => ({ drawImage() { if (canvasError) throw Error('canvas failure'); } }), toDataURL: () => 'data:image/webp;base64,AA==' }; return canvas; } }
  });
  return { ...exports, canvas: () => canvas };
}
test('una foto grande de celular se comprime antes de enviarse', async () => {
  const api = load();
  assert.match(await api.optimizeImage({ type: 'image/jpeg', size: 8 * 1024 * 1024 }), /^data:image\/webp/);
  assert.equal(api.canvas().width, 1000); assert.equal(api.canvas().height, 500);
});
test('archivos invalidos se rechazan antes de guardar', async () => {
  const api = load();
  for (const file of [{ type: 'text/plain', size: 100 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 21 * 1024 * 1024 }]) await assert.rejects(api.optimizeImage(file));
});
test('imagen corrupta o fallo de canvas termina con error y no queda guardando', async () => {
  for (const options of [{ broken: true }, { canvasError: true }]) await assert.rejects(load(options).optimizeImage({ type: 'image/png', size: 100 }));
});
