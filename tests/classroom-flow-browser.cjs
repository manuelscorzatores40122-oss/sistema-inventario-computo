/* Both real request handlers + browser UI, with an isolated in-memory DB adapter.
   No test writes or notifications reach Neon or real users. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jwt = require('jsonwebtoken');
require('@next/env').loadEnvConfig(process.cwd());
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3011';
const teacher = { id: 9001, nombre: 'Ana', apellido: 'Prueba', role: 'profesor', activo: true };
const admin = { id: 9000, nombre: 'Admin', apellido: 'Prueba', role: 'admin', activo: true };
let requests = [], schedule = [], notices = [], snapshot;
const future = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
const template = [{ hora_inicio: '07:00', hora_fin: '11:00' }];
const client = {
  release() {},
  async query(sql, p = []) {
    if (sql === 'BEGIN') snapshot = JSON.stringify({ requests, schedule, notices });
    else if (sql === 'ROLLBACK') ({ requests, schedule, notices } = JSON.parse(snapshot));
    else if (sql.includes('SELECT s.*')) return { rows: requests.filter(r => r.id === Number(p[0])).map(r => ({...r})) };
    else if (sql.startsWith('SELECT * FROM disponibilidad')) return { rows: schedule.filter(r => r.id === Number(p[0])) };
    else if (sql.includes('SELECT id') && sql.includes('FROM disponibilidad')) {
      const approval = sql.includes('id <> $1');
      const [day, date, start, end] = approval ? p.slice(1) : p;
      return { rows: schedule.filter(r => (!approval || r.id !== p[0]) && ['separado', 'pendiente'].includes(r.estado) &&
        (r.fecha_reserva === date || (!r.fecha_reserva && r.dia_semana === day)) && r.hora_inicio < end && r.hora_fin > start) };
    } else if (sql.startsWith('INSERT INTO disponibilidad')) {
      const row = { id: schedule.length + 501, sala_nombre:p[0], dia_semana:p[1], hora_inicio:p[2], hora_fin:p[3], estado:p[4], reservado_por:p[5], motivo_reserva:p[6], fecha_reserva:p[7], reservado_por_nombre:teacher.nombre, reservado_por_apellido:teacher.apellido };
      schedule.push(row); return { rows:[row] };
    } else if (sql.startsWith('INSERT INTO solicitudes')) {
      const slot = schedule.find(r => r.id === p[2]);
      const row = { id: requests.length + 101, profesor_id:p[0], inventario_id:p[1], disponibilidad_id:p[2], cantidad_solicitada:p[3], motivo:p[4], estado:'pendiente', fecha_solicitud:new Date().toISOString(), profesor_nombre:teacher.nombre, apellido:teacher.apellido, item_nombre:'Aula de Cómputo', fecha_reserva:slot.fecha_reserva, hora_inicio:slot.hora_inicio, hora_fin:slot.hora_fin };
      requests.push(row); return {rows:[row]};
    } else if (sql.startsWith('UPDATE disponibilidad')) {
      Object.assign(schedule.find(r => r.id === p[0]), {estado:sql.includes("'separado'") ? 'separado' : 'disponible'});
    } else if (sql.includes('UPDATE solicitudes')) {
      const row = requests.find(r => r.id === Number(p[5]));
      Object.assign(row, {estado:p[2], comentarios:p[4]});
      return {rows:[row]};
    } else if (sql.startsWith('SELECT nombre')) return {rows:[teacher]};
    else if (sql.includes('INSERT INTO notificaciones')) notices.push({id:notices.length+1, usuario_id:sql.includes('SELECT id') ? admin.id : p[0], mensaje:sql.includes('SELECT id') ? p[0] : p[2], tipo:sql.includes('SELECT id') ? p[1] : p[3], fecha_envio:new Date().toISOString()});
    else if (sql !== 'COMMIT' && !sql.includes('pg_advisory_xact_lock')) throw Error('SQL not modeled: '+sql);
    return {rows:[]};
  }
};
function load(file, actor) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020}}).outputText, {
    exports, console, Date, URL, require(name) {
      if (name === 'next/server') return {NextResponse:{json:(body, options) => ({body,status:options?.status || 200})}};
      if (name === '@/app/lib/session') return {requireSession:async (_req, adminOnly) => adminOnly && actor.role !== 'admin' ? {response:{status:403,body:{error:'Prohibido'}}} : {user:actor}};
      if (name === '@/app/lib/db') return {getClient:async () => client};
      if (name === '@/app/lib/admin-notifications') return load('app/lib/admin-notifications.ts',actor);
      if (name === '@/app/lib/time-label') return load('app/lib/time-label.ts',actor);
      throw Error(name);
    }
  });
  return exports;
}
async function main() {
  const browser = await chromium.launch({headless:true,channel:process.env.TEST_BROWSER_CHANNEL || 'msedge'});
  const errors = [];
  try {
    async function pageFor(actor, width) {
      const context = await browser.newContext({viewport:{width,height:900},locale:'es-PE'});
      await context.addCookies([{name:'auth-token',value:jwt.sign({userId:actor.id,role:actor.role},process.env.JWT_SECRET,{expiresIn:'15m'}),url:base,httpOnly:true}]);
      await context.addInitScript(u => localStorage.setItem('user',JSON.stringify(u)),actor);
      await context.route('**/api/**',async route => {
        const req = route.request(), url = new URL(req.url());
        let body = {}, status = 200;
        if (req.method() === 'POST' && url.pathname === '/api/solicitudes') ({body,status} = await load('app/api/solicitudes/route.ts',actor).POST({json:async () => req.postDataJSON()}));
        else if (req.method() === 'PUT' && /^\/api\/solicitudes\/\d+$/.test(url.pathname)) ({body,status} = await load('app/api/solicitudes/[id]/route.ts',actor).PUT({json:async () => req.postDataJSON()},{params:{id:url.pathname.split('/').at(-1)}}));
        else if (url.pathname === '/api/profesor/resumen') body = {user:teacher,inventory:[],requests,loans:[],schedule,template,notifications:notices.filter(n => n.usuario_id === teacher.id),updatedAt:new Date().toISOString()};
        else if (url.pathname === '/api/admin/resumen') body = {requests,loans:[],teachers:[teacher],items:[],schedule,template};
        else if (url.pathname === '/api/solicitudes') body = {solicitudes:requests};
        else if (url.pathname === '/api/notificaciones/lecturas') body = {keys:[]};
        else if (url.pathname.includes('notificaciones')) body = {notificaciones:notices.filter(n => n.usuario_id === actor.id)};
        else if (url.pathname.includes('registro')) body = {solicitudes:[],usuarios:[]};
        else body = {solicitudes:[],usuarios:[],prestamos:[],items:[]};
        await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
      });
      const page = await context.newPage();
      page.on('pageerror',e => errors.push(e.message));
      return page;
    }
    const prof = await pageFor(teacher,390), adm = await pageFor(admin,1280);
    await prof.goto(base+'/profesor/horario');
    await prof.getByRole('button',{name:'Solicitar reserva',exact:true}).click();
    await prof.getByLabel('Fecha de la clase').fill(future);
    await prof.getByLabel('Actividad y sección').fill('Clase de prueba de 7 a 11');
    await prof.getByRole('button',{name:'Enviar solicitud',exact:true}).click();
    await prof.getByText('Tu turno está en revisión').waitFor();
    assert.equal(requests[0].estado,'pendiente');
    assert.equal(schedule[0].hora_inicio,'07:00');
    assert.equal(schedule[0].hora_fin,'11:00');
    assert.ok(notices.some(n => n.usuario_id === admin.id));
    await adm.goto(base+'/admin/solicitudes');
    await adm.getByRole('button',{name:'Aprobar',exact:true}).first().click();
    await adm.waitForURL('**/admin/horario?reserva=501');
    await adm.getByText('Reserva aprobada y registrada en el calendario.',{exact:false}).waitFor();
    await adm.getByText('Clase de prueba de 7 a 11',{exact:true}).first().waitFor();
    assert.equal(schedule[0].estado,'separado');
    assert.equal(requests[0].estado,'aprobada');
    assert.ok(notices.some(n => n.usuario_id === teacher.id && n.tipo === 'solicitud_aprobada'));
    await prof.goto(base+'/profesor/solicitudes');
    await prof.locator('article [data-tone=green]').filter({hasText:'Aprobada'}).first().waitFor();
    // A competing legacy reservation appears after a second request was submitted.
    const other = new Date(future+'T12:00:00Z'); other.setUTCDate(other.getUTCDate()+1);
    const date = other.toISOString().slice(0,10);
    const create = await load('app/api/solicitudes/route.ts',teacher).POST({json:async () => ({tipo_solicitud:'aula',fecha_reserva:date,hora_inicio:'07:00',hora_fin:'11:00',motivo:'Reserva con conflicto'})});
    assert.equal(create.status,200);
    schedule.push({...schedule.at(-1),id:999,hora_inicio:'09:00',hora_fin:'10:00',estado:'separado',reservado_por:9002});
    await adm.goto(base+'/admin/solicitudes');
    await adm.getByRole('button',{name:'Aprobar',exact:true}).first().click();
    await adm.getByText('No se puede aprobar: el aula está ocupada de 9:00 a. m. a 10:00 a. m.',{exact:false}).waitFor();
    assert.equal(requests.at(-1).estado,'pendiente');
    await adm.getByRole('button',{name:'Rechazar',exact:true}).first().click();
    await adm.getByText('Solicitud marcada como rechazada',{exact:true}).waitFor();
    assert.equal(requests.at(-1).estado,'rechazada');
    assert.ok(notices.some(n => n.tipo === 'solicitud_rechazada'));
    fs.mkdirSync('test-results',{recursive:true});
    await adm.screenshot({path:'test-results/classroom-flow-admin.png',fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('Profesor móvil → solicitud 7–11 → admin aprueba → calendario en la fecha correcta → aviso docente; conflicto 9–10 bloqueado y rechazo verificados. Handlers reales, BD aislada.');
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error);process.exitCode=1;});
