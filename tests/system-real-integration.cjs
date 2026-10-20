/* Full-system test: real route handlers, real PostgreSQL, browser UI; all test data rolls back. */
const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path"),
  ts = require("typescript");
const assert = require("node:assert/strict");
require("@next/env").loadEnvConfig(process.cwd());
const { Pool } = require("pg");
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const admin = (
      await client.query(
        "SELECT id,role FROM usuarios WHERE role='admin' AND activo=true LIMIT 1",
      )
    ).rows[0];
    assert.ok(admin);
    let dni;
    for (let i = 0; i < 20; i++) {
      const candidate = String(90000000 + Math.floor(Math.random() * 9999999));
      if (
        !(
          await client.query(
            "SELECT id FROM usuarios WHERE dni=$1 OR email=$1",
            [candidate],
          )
        ).rows.length
      ) {
        dni = candidate;
        break;
      }
    }
    assert.ok(dni);
    const cache = new Map();
    const wrapped = {
      query: async (sql, params) => {
        if (sql === "BEGIN") return client.query("SAVEPOINT account_flow");
        if (sql === "COMMIT")
          return client.query("RELEASE SAVEPOINT account_flow");
        if (sql === "ROLLBACK") {
          await client.query("ROLLBACK TO SAVEPOINT account_flow");
          return client.query("RELEASE SAVEPOINT account_flow");
        }
        return client.query(sql, params);
      },
      release() {},
    };
    const db = {
      query: (sql, params) => client.query(sql, params),
      getClient: async () => wrapped,
    };
    function load(file) {
      file = path.resolve(file);
      if (cache.has(file)) return cache.get(file);
      const exports = {};
      cache.set(file, exports);
      vm.runInNewContext(
        ts.transpileModule(fs.readFileSync(file, "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            esModuleInterop: true,
          },
        }).outputText,
        {
          exports,
          process,
          console,
          Buffer,
          Date,
          Intl,
          URL,
          setTimeout,
          clearTimeout,
          require(name) {
            if (name === "@/app/lib/db" || name === "./db") return db;
            if (name.startsWith("@/")) return load(name.slice(2) + ".ts");
            if (name.startsWith("."))
              return load(path.resolve(path.dirname(file), name) + ".ts");
            return require(name);
          },
        },
        { filename: file },
      );
      return exports;
    }
    const auth = load("app/lib/auth.ts");
    const registration = load("app/api/auth/register/route.ts");
    const login = load("app/api/auth/login/route.ts");
    const users = load("app/api/usuarios/[id]/route.ts");
    const { NextRequest } = require("next/server");
    const request = (route, body, token) =>
      new NextRequest("http://localhost:3011" + route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { cookie: "auth-token=" + token } : {}),
        },
        body: JSON.stringify(body),
      });
    const password = require('node:crypto').randomBytes(18).toString('base64url');
    const adminToken = auth.generateToken(admin.id, 'admin');
    const results = [];
    async function call(url, method, body, token, expected = 200) {
      const pathname = new URL(url, 'http://localhost:3011').pathname;
      const parts = pathname.split('/').filter(Boolean);
      const params = {};
      let folder = 'app';
      for (const part of parts) {
        if (fs.existsSync(path.join(folder, part))) folder = path.join(folder, part);
        else { folder = path.join(folder, '[id]'); params.id = part; }
      }
      const req = new NextRequest('http://localhost:3011'+url, {method,headers:{'Content-Type':'application/json',...(token ? {cookie:'auth-token='+token}:{})},...(body !== undefined ? {body:JSON.stringify(body)}:{})});
      const response = await load(path.join(folder,'route.ts'))[method](req,{params});
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      assert.equal(response.status,expected,method+' '+url+': '+text.slice(0,350));
      return data;
    }
    async function check(name, run) { const start=performance.now(); await run(); results.push({name,ms:Math.round(performance.now()-start)}); console.log('OK: '+name); }
    let teacherId, teacherToken, itemId, emptyId;
    await check('Registro nuevo, bloqueo previo a aprobación, bandeja y activación', async () => {
      const registered = await call('/api/auth/register','POST',{dni,nombre:'QA temporal',apellido:'Sistema',password,area:'Prueba integral'},null,201);
      teacherId=registered.user.id;
      await call('/api/auth/login','POST',{email:dni,password},null,401);
      const inbox=await call('/api/solicitudes/cuentas','GET',undefined,adminToken);
      assert.ok(JSON.stringify(inbox).includes(String(teacherId)));
      await call('/api/solicitudes/cuentas/'+teacherId,'PUT',{estado:'aprobada'},adminToken);
      const logged=await call('/api/auth/login','POST',{email:dni,password});
      teacherToken=logged.token; assert.ok(teacherToken);
    });
    await check('Crear dos equipos y editar ficha; validaciones de cantidades',async () => {
      const item=await call('/api/inventario','POST',{nombre:'QA temporal '+dni,categoria:'Computación',cantidad_total:30,cantidad_disponible:30,marca:'Prueba',codigo_patrimonial:'QA-'+dni},adminToken);
      itemId=item.item.id;
      emptyId=(await call('/api/inventario','POST',{nombre:'QA sin stock '+dni,categoria:'Computación',cantidad_total:1,cantidad_disponible:0},adminToken)).item.id;
      await call('/api/inventario/'+itemId,'PUT',{modelo:'Edición verificada',ubicacion:'QA'},adminToken);
      await call('/api/inventario','POST',{nombre:'QA inválido',categoria:'Computación',cantidad_total:1,cantidad_disponible:2},adminToken,400);
      await call('/api/inventario','POST',{nombre:'Sin permiso',categoria:'Computación',cantidad_total:1},teacherToken,403);
    });
    if (!process.env.QA_BROWSER_ONLY) {
    const ids=[];
    await check('20 solicitudes reales, aprobación, rechazo y cancelación', async () => {
      for(let i=0;i<20;i++) {
        const data=await call('/api/solicitudes','POST',{inventario_id:itemId,cantidad_solicitada:1,motivo:'QA actividad '+i,seccion:'QA'},teacherToken);
        ids.push(data.solicitud.id);
      }
      for(let i=0;i<10;i++) await call('/api/solicitudes/'+ids[i],'PUT',{estado:'aprobada',comentarios:'QA aprobado'},adminToken);
      for(let i=10;i<15;i++) await call('/api/solicitudes/'+ids[i],'PUT',{estado:'rechazada',comentarios:'QA rechazado'},adminToken);
      for(let i=15;i<20;i++) await call('/api/solicitudes/'+ids[i]+'/cancelar','POST',{},teacherToken);
      await call('/api/solicitudes/'+ids[0],'PUT',{estado:'aprobada'},adminToken,409);
      const row=(await client.query('SELECT cantidad_disponible FROM inventario WHERE id=$1',[itemId])).rows[0];
      assert.equal(row.cantidad_disponible,20);
    });
    await check('Entregar y devolver 10 préstamos; stock recuperado sin duplicación',async () => {
      const loans=(await client.query('SELECT id FROM prestamos WHERE profesor_id=$1 AND inventario_id=$2',[teacherId,itemId])).rows;
      assert.equal(loans.length,10);
      for(const loan of loans) {
        await call('/api/prestamos/'+loan.id,'PUT',{estado:'prestado'},adminToken);
        await call('/api/prestamos/'+loan.id,'PUT',{estado:'devuelto',devolucion_estado:'bueno',devolucion_observacion:'QA recibido'},adminToken);
      }
      await call('/api/prestamos/'+loans[0].id,'PUT',{estado:'devuelto'},adminToken,400);
      assert.equal((await client.query('SELECT cantidad_disponible FROM inventario WHERE id=$1',[itemId])).rows[0].cantidad_disponible,30);
    });
    await check('Préstamo directo, cancelación, Kardex y anotación de reparación',async () => {
      const direct=await call('/api/prestamos','POST',{profesor_id:teacherId,inventario_id:itemId,cantidad:2,detalle:'QA directo'},adminToken);
      const loan=direct.prestamo;
      // Direct loans may already be delivered; use the returned state.
      await call('/api/prestamos/'+loan.id,'PUT',{estado:loan.estado==='pendiente'?'cancelado':'devuelto'},adminToken);
      await call('/api/inventario/'+itemId+'/historial','POST',{tipo:'reparacion',descripcion:'QA revisión temporal'},adminToken,201);
      const history=await call('/api/inventario/'+itemId+'/historial','GET',undefined,adminToken);
      assert.ok(history.totales.prestamos>=11); assert.ok(history.eventos.some(e=>e.tipo_movimiento==='reparacion'));
    });
    await check('Perfil, permisos, avisos y resúmenes de ambos roles',async () => {
      await call('/api/usuarios/'+teacherId,'PUT',{telefono:'999000111',correo_personal:'qa@example.com'},teacherToken);
      await call('/api/usuarios/'+teacherId,'PUT',{role:'admin'},teacherToken,403);
      const summary=await call('/api/profesor/resumen','GET',undefined,teacherToken);
      assert.equal(summary.requests.length,20); assert.ok(summary.requests.every(r=>r.profesor_id===teacherId));
      assert.equal(summary.inventory.find(i=>i.id===emptyId)?.cantidad_disponible,0);
      const notices=await call('/api/notificaciones','GET',undefined,teacherToken);
      assert.ok(notices.notificaciones.some(n=>n.tipo==='solicitud_aprobada'));
      await call('/api/admin/resumen','GET',undefined,adminToken);
      await call('/api/admin/resumen','GET',undefined,teacherToken,403);
    });
    // Pick an actually free future interval, respecting all existing college reservations.
    let bookingDate;
    for(let n=1;n<90;n++) {
      const d=new Date(Date.now()+n*86400000), date=d.toISOString().slice(0,10);
      const day=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][d.getUTCDay()];
      const taken=await client.query("SELECT id FROM disponibilidad WHERE estado IN ('separado','pendiente') AND ((fecha_reserva IS NULL AND dia_semana=$1) OR fecha_reserva::date=$2::date) AND hora_inicio<'11:00' AND hora_fin>'07:00'",[day,date]);
      if(!taken.rows.length){bookingDate=date;break;}
    }
    assert.ok(bookingDate,'No free 7–11 interval found');
    await check('Reserva real 7–11, conflicto, aprobación y liberación',async () => {
      const payload={tipo_solicitud:'aula',fecha_reserva:bookingDate,hora_inicio:'07:00',hora_fin:'11:00',motivo:'QA reserva real'};
      const created=await call('/api/solicitudes','POST',payload,teacherToken);
      await call('/api/solicitudes','POST',payload,teacherToken,409);
      await call('/api/solicitudes/'+created.solicitud.id,'PUT',{estado:'aprobada'},adminToken);
      const slot=(await client.query('SELECT estado FROM disponibilidad WHERE id=$1',[created.solicitud.disponibilidad_id])).rows[0]; assert.equal(slot.estado,'separado');
      await call('/api/disponibilidad/'+created.solicitud.disponibilidad_id,'DELETE',undefined,adminToken);
    });
    }
    const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
    const browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER_CHANNEL || 'msedge'});
    let queue=Promise.resolve(); const contexts=[];
    try {
      const pageErrors=[];
      async function pageFor(token,width) {
        const ctx=await browser.newContext({viewport:{width,height:900},locale:'es-PE'}); contexts.push(ctx);
        if(token) await ctx.addInitScript(u=>localStorage.setItem('user',JSON.stringify(u)),{id:admin.id,role:'admin',nombre:'Administración QA'});
        if(token) await ctx.addCookies([{name:'auth-token',value:token,url:'http://localhost:3011',httpOnly:true}]);
        await ctx.route('**/api/**',route => {
          const task=queue.then(async()=>{
            const req=route.request(), url=new URL(req.url());
            const headers=await req.allHeaders();
            const cookie=headers.cookie || '';
            const tokenValue=/auth-token=([^;]+)/.exec(cookie)?.[1];
            const parts=url.pathname.split('/').filter(Boolean); let folder='app'; const params={};
            for(const part of parts) { if(fs.existsSync(path.join(folder,part)))folder=path.join(folder,part); else {folder=path.join(folder,'[id]');params.id=part;} }
            const handler=load(path.join(folder,'route.ts'))[req.method()];
            const response=await handler(new NextRequest(req.url(),{method:req.method(),headers,...(!['GET','HEAD'].includes(req.method())?{body:req.postData()}:{})}),{params});
            await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
          }); queue=task.catch(()=>{});return task;
        });
        const page=await ctx.newPage(); page.on('pageerror',e=>pageErrors.push(e.message)); return page;
      }
      await check('Navegador real: login del docente y pantallas móviles con SQL real',async()=>{
        const page=await pageFor(null,390);
        await page.goto('http://localhost:3011/auth/login');
        await page.locator('#email').fill(dni);
        await page.locator('#password').fill(password);
        await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
        await page.waitForURL('**/profesor/dashboard');
        await page.goto('http://localhost:3011/profesor/solicitar-articulo');
        await page.getByLabel('Buscar equipos').fill('QA temporal '+dni);
        await page.getByRole('button',{name:'Seleccionar QA temporal '+dni,exact:true}).click();
        await page.getByLabel('Sección',{exact:true}).fill('QA');
        await page.getByLabel('Actividad o motivo').fill('QA navegación '+dni);
        await page.getByRole('button',{name:'Enviar solicitud',exact:true}).click();
        await page.getByRole('dialog').waitFor();
        assert.equal((await client.query('SELECT count(*)::int AS n FROM solicitudes WHERE profesor_id=$1 AND motivo=$2',[teacherId,'QA navegación '+dni])).rows[0].n,1);
        await page.getByRole('button',{name:'Cerrar ventana',exact:true}).click();
        for(const route of ['dashboard','solicitar-articulo','solicitudes','horario','perfil']) {
          await page.goto('http://localhost:3011/profesor/'+route);
          await page.waitForLoadState('networkidle');
          await page.locator('h1').first().waitFor({state:'attached'});
          if(route==='solicitar-articulo') assert.equal(await page.getByRole('button',{name:'Seleccionar QA sin stock '+dni,exact:true}).count(),0);
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        }
        fs.mkdirSync('test-results',{recursive:true});
        await page.screenshot({path:'test-results/system-real-profesor.png',fullPage:true});
      });
      await check('Navegador real: paneles de administración y equipo creado',async()=>{
        const page=await pageFor(adminToken,1280);
        for(const route of ['dashboard','inventario','solicitudes','prestamos','profesores','horario','equipos/'+itemId]) {
          await page.goto('http://localhost:3011/admin/'+route);
          await page.waitForLoadState('networkidle');
          await page.locator('h1, h2').first().waitFor();
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        }
        await page.screenshot({path:'test-results/system-real-admin.png',fullPage:true});
        await page.goto('http://localhost:3011/admin/solicitudes');
        await page.getByRole('row').filter({hasText:'QA navegación '+dni}).getByRole('button',{name:'Aprobar',exact:true}).click();
        await page.waitForURL('**/admin/prestamos');
        assert.equal((await client.query('SELECT estado FROM solicitudes WHERE profesor_id=$1 AND motivo=$2',[teacherId,'QA navegación '+dni])).rows[0].estado,'aprobada');
        assert.deepEqual(pageErrors,[]);
      });
    } finally { for(const ctx of contexts) await ctx.unrouteAll({behavior:'wait'}); await queue; await browser.close(); }
    fs.mkdirSync('test-results',{recursive:true});
    fs.writeFileSync('test-results/system-real-report.json',JSON.stringify({date:new Date().toISOString(),results,rolledBack:true},null,2));
    console.log('TODOS LOS ESCENARIOS SUPERADOS: '+results.length);
  } finally {
    await client.query('ROLLBACK'); client.release(); await pool.end();
    console.log('ROLLBACK: cuentas, equipos, solicitudes, préstamos y avisos de prueba descartados.');
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
