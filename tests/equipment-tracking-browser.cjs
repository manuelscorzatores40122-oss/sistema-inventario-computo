const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const jwt=require('jsonwebtoken'),JsBarcode=require('jsbarcode');
const {RGBLuminanceSource,BinaryBitmap,HybridBinarizer,MultiFormatReader,DecodeHintType,BarcodeFormat}=require('@zxing/library');
require('@next/env').loadEnvConfig(process.cwd());
const base=process.env.TEST_BASE_URL || 'http://localhost:3011';
const items=[{id:77,nombre:'Proyector de prueba',codigo_patrimonial:'PAT-77',categoria:'Proyectores',cantidad_total:1,cantidad_disponible:1,estado:'disponible',condicion:'bueno'},{id:78,nombre:'Laptop de prueba',codigo_patrimonial:'PAT-78',categoria:'Computadoras',cantidad_total:1,cantidad_disponible:0,estado:'disponible',condicion:'regular'}];
let active=[{id:801,estado:'prestado',cantidad:1,profesor:'Ana Torres'}],events=[],writes=[];
const user={id:9000,nombre:'Admin',apellido:'Prueba',role:'admin'};
function decode(image) {
  const pixels=new Uint8ClampedArray(image.width*image.height);
  for(let i=0;i<pixels.length;i++)pixels[i]=image.data[i*4];
  const reader=new MultiFormatReader();
  return reader.decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,image.width,image.height))),new Map([[DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.CODE_128]]])).getText();
}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    const context=await browser.newContext({viewport:{width:1280,height:800}});
    await context.addCookies([{name:'auth-token',value:jwt.sign({userId:user.id,role:'admin'},process.env.JWT_SECRET,{expiresIn:'20m'}),url:base}]);
    const encoded={};JsBarcode(encoded,'EQ-77',{format:'CODE128'});
    const bits=encoded.encodings[0].data;
    const barcodeSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="${bits.length*3+60}" height="180"><rect width="100%" height="100%" fill="white"/>${[...bits].map((bit,index)=>bit==='1'?`<rect x="${30+index*3}" y="20" width="3" height="140"/>`:'').join('')}</svg>`;
    const cameraBarcode=`data:image/svg+xml,${encodeURIComponent(barcodeSvg)}`;
    await context.addInitScript(({user,cameraBarcode})=>{
      localStorage.setItem('user',JSON.stringify(user));
      navigator.mediaDevices.getUserMedia=async()=>{
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
        const img=new Image();img.src=cameraBarcode;await img.decode();
        const draw=()=>{const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,640,640);ctx.drawImage(img,70,220,500,200);};
        draw();const timer=setInterval(draw,100);
        const stream=canvas.captureStream(10);
        window.cameraStream=stream;
        for(const track of stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{clearInterval(timer);stop();};}
        return stream;
      };
    },{user,cameraBarcode});
    await context.route('**/api/**',async route=>{
      const request=route.request(),url=new URL(request.url());
      let data={};
      if(request.method()!=='GET'){
        writes.push({url:url.pathname,body:request.postDataJSON()});
        if(url.pathname.includes('/historial'))events.unshift({id:1,tipo_movimiento:'reparacion',descripcion:request.postDataJSON().descripcion,fecha:new Date().toISOString(),registrado_por:'Admin Prueba'});
        if(url.pathname==='/api/prestamos/801')active=[];
        data={message:'Cambio guardado.'};
      }else if(url.pathname.endsWith('/historial'))data={equipo:{...items[0],fecha_creacion:'2026-01-01T10:00:00Z',fecha_ingreso:null},prestamos:[{id:801,profesor:'Ana Torres',cantidad:1,estado:active.length?'prestado':'devuelto',fecha_prestamo:'2026-10-01T14:00:00Z',devolucion_observacion:null}],activos:active,eventos:events,totales:{prestamos:1,eventos:events.length}};
      else if(url.pathname==='/api/inventario')data={items};
      else if(url.pathname==='/api/usuarios')data={usuarios:[{id:9001,nombre:'Ana',apellido:'Torres',dni:'12345678'}]};
      else if(url.pathname==='/api/admin/resumen')data={requests:[],loans:[],teachers:[],items,schedule:[],template:[]};
      else if(url.pathname==='/api/admin/prestamos-vencidos')data={prestamos:[{id:801,inventario_id:77,equipo:items[0].nombre,profesor:'Ana Torres',cantidad:1,telefono:'999111222',vence:'2026-10-01T18:00:00Z'}]};
      else data={notificaciones:[],keys:[],solicitudes:[],usuarios:[],prestamos:[]};
      await route.fulfill({json:data});
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/admin/inventario`);
    await page.getByRole('checkbox',{name:'Seleccionar equipos de esta página'}).check();
    await page.getByRole('button',{name:'Imprimir códigos de barras (2)'}).click();
    const preview=page.frameLocator('iframe[title="Vista previa de etiquetas"]');
    await preview.locator('article').first().waitFor();
    assert.equal(await preview.locator('article').count(),2);
    const barcodeImage=await preview.locator('.barcode').first().evaluate(async img=>{
      await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
      return {width:canvas.width,height:canvas.height,data:Array.from(ctx.getImageData(0,0,canvas.width,canvas.height).data)};
    });
    assert.equal(decode(barcodeImage),'EQ-77');
    const frame=page.frames().find(frame=>frame.url()==='about:srcdoc');
    await frame.evaluate(()=>window.print=()=>{window.printCalled=true;});
    await page.getByRole('button',{name:'Imprimir hoja',exact:true}).click();
    assert(await frame.evaluate(()=>window.printCalled));
    await page.screenshot({path:'test-results/barcode-print-preview.png'});
    await page.getByRole('button',{name:'Cerrar ventana',exact:true}).click();
    await page.getByRole('button',{name:'Ver ficha de Proyector de prueba'}).click();
    await page.getByText('Sin registrar: puedes añadirlo abajo').waitFor();
    await page.getByLabel('Tipo de anotación').selectOption('reparacion');
    await page.getByLabel('Descripción o documento de referencia').fill('Limpieza del ventilador y revisión');
    await page.getByRole('button',{name:'Guardar anotación',exact:true}).click();
    await page.getByText('Reparación registrada',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Registrar devolución',exact:true}).click();
    await page.getByLabel('Estado al devolver').selectOption('regular');
    await page.getByLabel('Observaciones',{exact:true}).fill('Carcasa con desgaste');
    await page.getByRole('button',{name:'Confirmar devolución',exact:true}).click();
    await page.getByText('No hay préstamos activos de este equipo.').waitFor();
    assert(writes.some(row=>row.url==='/api/prestamos/801'&&row.body.devolucion_estado==='regular'));
    await page.getByRole('button',{name:'Prestar equipo',exact:true}).click();
    await page.getByRole('dialog').last().waitFor();
    assert(await page.locator('select').evaluateAll(selects=>selects.some(select=>select.value==='77')));
    // Leave nested forms without performing a real loan.
    await page.goto(`${base}/admin/inventario`);
    await page.getByRole('button',{name:'Escanear con cámara',exact:true}).click();
    await page.waitForURL('**/admin/equipos/77',{timeout:30000});
    assert(await page.evaluate(()=>window.cameraStream.getTracks().every(track=>track.readyState==='ended')), 'Scanner must release camera');
    await page.getByText('Ingreso al colegio',{exact:true}).waitFor();
    for(const width of [1280,1024,390,320]){
      await page.setViewportSize({width,height:740});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Record overflow ${width}`);
    }
    await page.screenshot({path:'test-results/equipment-kardex-mobile.png'});
    await page.goto(`${base}/admin/dashboard`);
    await page.getByRole('region',{name:'Préstamos vencidos'}).waitFor();
    assert.equal(await page.getByRole('link',{name:'999111222'}).getAttribute('href'),'tel:999111222');
    await page.getByRole('link',{name:'Abrir ficha y devolver →'}).click();
    await page.waitForURL('**/admin/equipos/77');
    assert.deepEqual(errors,[]);
    await context.close();
    const anon=await browser.newContext();
    const anonPage=await anon.newPage();
    await anonPage.goto(`${base}/admin/equipos/77`);
    assert(new URL(anonPage.url()).searchParams.get('equipo')==='77');
    await anon.close();
    console.log('PASS: printed Code 128 decoded, camera decoded barcode video, Kardex/repair/return/loan preselection, four widths, overdue contacts and login continuation. API writes simulated.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
