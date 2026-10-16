const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup(currentState = 'pendiente') {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT p.*') || sql.includes('SELECT estado')) {
        return {
          rows: [{
            id: 15,
            inventario_id: 3,
            profesor_id: 7,
            cantidad: 2,
            estado: currentState,
            cantidad_disponible: 4,
            item_nombre: 'Laptop HP'
          }]
        };
      }
      return { rows: [{ id: 15 }] };
    },
    release() {}
  };

  const exported = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(path.resolve(__dirname, '../app/api/prestamos/[id]/route.ts'), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
    ).outputText,
    {
      exports: exported,
      console,
      require(name) {
        if (name === '@/app/lib/session') return { requireSession: async () => ({ user: { id: 1, role: 'admin', activo: true }, response: null }) };
      if (name === 'next/server') {
          return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
        }
        if (name === '@/app/lib/db') {
          return { getClient: async () => client, query: async (sql, params) => client.query(sql, params) };
        }
        throw new Error(name);
      }
    }
  );

  return {
    calls,
    update: body => exported.PUT({ json: async () => body }, { params: { id: '15' } }),
    remove: () => exported.DELETE({}, { params: { id: '15' } })
  };
}

test('cancelar préstamo pendiente repone stock y registra movimiento de entrada', async () => {
  const { calls, update } = setup('pendiente');
  const res = await update({ estado: 'cancelado' });

  assert.equal(res.status, 200);
  assert.equal(res.body.message, 'Préstamo cancelado y stock restablecido al inventario');

  const stockUpdate = calls.find(c => c.sql.includes('UPDATE inventario SET cantidad_disponible = cantidad_disponible + $1'));
  assert.ok(stockUpdate, 'Debe restituir stock al inventario');
  assert.equal(stockUpdate.params[0], 2);
  assert.equal(stockUpdate.params[1], 3);

  const movimiento = calls.find(c => c.sql.includes('INSERT INTO movimientos_inventario'));
  assert.ok(movimiento, 'Debe registrar movimiento de entrada');
  assert.equal(movimiento.params[1], 'entrada');
  assert.equal(movimiento.params[2], 2);

  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('marcar devuelto guarda estado físico y observaciones de devolución', async () => {
  const { calls, update } = setup('prestado');
  const res = await update({
    estado: 'devuelto',
    devolucion_observacion: 'Devuelto con cable HDMI completo',
    devolucion_estado: 'bueno'
  });

  assert.equal(res.status, 200);
  const prestamoUpdate = calls.find(c => c.sql.includes('UPDATE prestamos'));
  assert.ok(prestamoUpdate);
  assert.equal(prestamoUpdate.params[1], 'Devuelto con cable HDMI completo');
  assert.equal(prestamoUpdate.params[2], 'bueno');
});

test('no permite eliminar préstamos pendientes o prestados sin devolver o cancelar', async () => {
  const { calls, remove } = setup('prestado');
  calls.length = 0;
  // Simular consulta de estado en DELETE
  calls.push = function(item) {
    Array.prototype.push.call(this, item);
  };
  const res = await remove();
  assert.equal(res.status, 400);
  assert.ok(res.body.error.includes('No se puede eliminar un préstamo activo o pendiente'));
});
