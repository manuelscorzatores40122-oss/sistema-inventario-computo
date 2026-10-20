const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,mocks={}) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,Date,Intl,URL,console,require(name) {
      if(name in mocks)return mocks[name];
      if(name==='next/server')return {NextResponse:{json:(body,options)=>({body,status:options?.status||200})}};
      throw Error(name);
    },
  });
  return exports;
}
const slots=load('app/lib/school-slots.ts');
const {loanDeadline}=load('app/lib/loan-deadline.ts',{'./school-slots':slots});
const barcode=load('app/lib/equipment-barcode.ts');
test('Deadline uses Lima school closure, including the exact boundary and out-of-hours 24h',()=>{
  assert.equal(loanDeadline('2026-10-20T15:00:00Z',null),'2026-10-20T18:00:00.000Z');
  assert.equal(loanDeadline('2026-10-20T11:00:00Z',null),'2026-10-21T11:00:00.000Z');
  assert.equal(loanDeadline('2026-10-20T18:00:00Z',null),'2026-10-21T18:00:00.000Z');
  assert.equal(loanDeadline('2026-10-20T23:30:00Z',null),'2026-10-21T23:30:00.000Z');
  assert.equal(loanDeadline('2026-10-21T02:30:00Z',null),'2026-10-22T02:30:00.000Z');
  assert.equal(loanDeadline('2026-10-20T15:00:00Z',[{hora_inicio:'09:00',hora_fin:'17:30'}]),'2026-10-20T22:30:00.000Z');
  assert.equal(loanDeadline('invalid',null),null);
});
test('Code 128 values identify inventory records and reject arbitrary input',()=>{
  assert.equal(barcode.equipmentBarcode(44),'EQ-44');
  assert.equal(barcode.readEquipmentBarcode('EQ-44'),44);
  assert.equal(barcode.equipmentPath(44),'/admin/equipos/44');
  for(const value of ['https://evil.example/admin/equipos/44','javascript:alert(1)','EQ-0','EQ-3?delete=true','EQ-9007199254740993','ABC-2','EQ-1.5']) assert.equal(barcode.readEquipmentBarcode(value),null);
});
test('History requires admin before querying and rejects malformed IDs',async()=>{
  let reads=0;
  const db={query:async()=>{reads++;return{rows:[]};}};
  let session={response:{status:403}};
  const route=load('app/api/inventario/[id]/historial/route.ts',{'@/app/lib/session':{requireSession:async(request,admin)=>{assert.equal(admin,true);return session;}},'@/app/lib/db':db});
  assert.equal((await route.GET({}, {params:{id:'1'}})).status,403);
  assert.equal(reads,0);
  session={user:{id:1},response:null};
  assert.equal((await route.GET({}, {params:{id:'NaN'}})).status,400);
  assert.equal((await route.GET({}, {params:{id:'12'}})).status,404);
});
test('Repair annotation is transactional, audited and does not alter stock',async()=>{
  const calls=[];
  const client={query:async(sql,params)=>{calls.push({sql,params});return{rows:sql.startsWith('SELECT')?[{id:7}]:[]};},release(){}};
  const route=load('app/api/inventario/[id]/historial/route.ts',{'@/app/lib/session':{requireSession:async()=>({user:{id:3},response:null})},'@/app/lib/db':{getClient:async()=>client}});
  const response=await route.POST({json:async()=>({tipo:'reparacion',descripcion:'Cambio de batería'})},{params:{id:'7'}});
  assert.equal(response.status,201);
  const insert=calls.find(call=>call.sql.includes('INSERT'));
  assert.equal(insert.params[0],7);assert.equal(insert.params[1],'reparacion');assert.equal(insert.params[2],3);
  assert(!calls.some(call=>call.sql.includes('UPDATE inventario')));
  assert.equal(calls.at(-1).sql,'COMMIT');
});
test('History rejects future or impossible arrival dates before writing',async()=>{
  const route=load('app/api/inventario/[id]/historial/route.ts',{'@/app/lib/session':{requireSession:async()=>({user:{id:3},response:null})},'@/app/lib/db':{getClient:async()=>{throw Error('Must not query');}}});
  for(const date of ['2999-01-01','2026-02-30','x']) assert.equal((await route.POST({json:async()=>({tipo:'ingreso',descripcion:'Documento',fecha_ingreso:date})},{params:{id:'7'}})).status,400);
});
test('An approved pending loan starts its deadline when physically delivered',async()=>{
  const calls=[];
  const client={query:async(sql)=>{calls.push(sql);return{rows:sql.includes('SELECT p.*')?[{id:8,estado:'pendiente',inventario_id:7}]:[]};},release(){}};
  const route=load('app/api/prestamos/[id]/route.ts',{'@/app/lib/session':{requireSession:async()=>({user:{id:3},response:null})},'@/app/lib/db':{getClient:async()=>client}});
  assert.equal((await route.PUT({json:async()=>({estado:'prestado'})},{params:{id:'8'}})).status,200);
  assert(calls.some(sql=>sql.includes("SET estado = 'prestado'")&&sql.includes('fecha_prestamo = CURRENT_TIMESTAMP')));
});
test('A failed history insert rolls back the arrival-date change',async()=>{
  const calls=[];
  const client={query:async(sql)=>{calls.push(sql);if(sql.includes('INSERT'))throw Error('Storage failure');return{rows:sql.startsWith('SELECT')?[{id:7}]:[]};},release(){}};
  const route=load('app/api/inventario/[id]/historial/route.ts',{'@/app/lib/session':{requireSession:async()=>({user:{id:3},response:null})},'@/app/lib/db':{getClient:async()=>client}});
  const response=await route.POST({json:async()=>({tipo:'ingreso',fecha_ingreso:'2020-01-01',descripcion:'Acta de recepción'})},{params:{id:'7'}});
  assert.equal(response.status,500);
  assert.equal(calls.at(-1),'ROLLBACK');
  assert(!calls.includes('COMMIT'));
});
