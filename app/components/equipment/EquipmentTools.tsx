'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiCamera, FiPrinter } from 'react-icons/fi';
import { Modal } from '../teacher/TeacherUi';
import { equipmentPath, equipmentBarcode, readEquipmentBarcode } from '@/app/lib/equipment-barcode';
import s from './EquipmentTools.module.css';
type Item = {id:number; nombre:string; codigo_patrimonial?:string|null; cantidad_total:number};
const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

export default function EquipmentTools({items,selected,onClear}:{items:Item[];selected:number[];onClear:()=>void}) {
  const [printing,setPrinting]=useState(false),[scanning,setScanning]=useState(false);
  const chosen=useMemo(()=>items.filter(item=>selected.includes(item.id)),[items,selected]);
  return <>
    <div className={s.toolbar}><div><strong>Identificación y seguimiento</strong><p>Marca los equipos que quieres etiquetar. Haz clic en su nombre para ver la ficha.</p></div><div className={s.actions}>
      <button type="button" onClick={()=>setScanning(true)}><FiCamera/> Escanear con cámara</button>
      <button type="button" disabled={!chosen.length} onClick={()=>setPrinting(true)}><FiPrinter/> Imprimir códigos de barras ({chosen.length})</button>
      {!!selected.length && <button type="button" onClick={onClear}>Quitar selección</button>}
    </div></div>
    {printing && <LabelSheet items={chosen} onClose={()=>setPrinting(false)}/>}
    {scanning && <Scanner onClose={()=>setScanning(false)}/>}
  </>;
}

function LabelSheet({items,onClose}:{items:Item[];onClose:()=>void}) {
  const [html,setHtml]=useState(''),[error,setError]=useState(''),[ready,setReady]=useState(false),[perPage,setPerPage]=useState(24);
  const frame=useRef<HTMLIFrameElement>(null);
  useEffect(()=>{
    let cancelled=false;
    setHtml('');setReady(false);setError('');
    async function generate() {
      try {
        const JsBarcode=(await import('jsbarcode')).default;
        const labels=items.map(item=>{
          const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
          JsBarcode(svg,equipmentBarcode(item.id),{format:'CODE128',width:2,height:50,margin:10,fontSize:14,displayValue:true});
          const barcode=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
          return `<article><div class="top"><img class="logo" src="${location.origin}/logo.png" alt=""><div class="text"><small>COLEGIO MANUEL SCORZA${item.cantidad_total>1?` · ${item.cantidad_total} unidades`:''}</small><strong>${escapeHtml(item.nombre)}</strong><b>${escapeHtml(item.codigo_patrimonial || 'Sin código patrimonial')}</b></div></div><img class="barcode" src="${escapeHtml(barcode)}" alt="${equipmentBarcode(item.id)}"></article>`;
        });
        const pages=Array.from({length:Math.ceil(labels.length/perPage)},(_,index)=>`<section>${labels.slice(index*perPage,(index+1)*perPage).join('')}</section>`).join('');
        if(!cancelled) setHtml(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Etiquetas de equipos</title><style>
          @page{size:A4;margin:12.9mm 9.75mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#000;background:#fff}section{display:grid;grid-template-columns:repeat(3,63.5mm);grid-auto-rows:${perPage===24?'33.9':'38.1'}mm;break-after:page}section:last-child{break-after:auto}article{border:.2mm dashed #aaa;display:flex;flex-direction:column;justify-content:center;padding:1mm 2mm;overflow:hidden;break-inside:avoid}.top{display:flex;align-items:center;gap:2mm;min-height:11mm}.logo{width:7mm;height:8mm;object-fit:contain}.barcode{width:100%;height:18mm;object-fit:contain}.text{min-width:0;flex:1}strong{font-size:8pt;display:block;line-height:1.15;max-height:6.5mm;overflow:hidden}b{display:block;font-size:7pt;overflow-wrap:anywhere}small{font-size:5.5pt;display:block}@media screen{body{padding:8px}section{margin-bottom:10mm}}</style></head><body>${pages}</body></html>`);
      } catch {if(!cancelled)setError('No se pudieron generar las etiquetas. Cierra la ventana e inténtalo de nuevo.');}
    }
    void generate();return()=>{cancelled=true;};
  },[items,perPage]);
  return <Modal wide title="Códigos de barras para imprimir" onClose={onClose}><div className={s.record}>
    <p>{items.length} etiquetas · Papel A4 autoadhesivo. Imprime al 100 % de escala, sin encabezados ni pies de página. Prueba primero una hoja normal.</p>
    <label>Formato de hoja<select value={perPage} onChange={event=>setPerPage(Number(event.target.value))}><option value={24}>24 etiquetas · 63,5 × 33,9 mm</option><option value={21}>21 etiquetas · 63,5 × 38,1 mm</option></select></label>
    <p className={s.hint}>Formato Code 128. Cada barra identifica un equipo con su número EQ. Usa «Escanear con cámara» dentro del sistema para abrir su ficha.</p>
    {error && <p role="alert" className={s.error}>{error}</p>}
    {!html && !error && <p role="status">Generando códigos de barras…</p>}
    {html && <iframe ref={frame} className={s.printPreview} title="Vista previa de etiquetas" srcDoc={html} onLoad={()=>setReady(true)}/>}
    <button disabled={!ready} onClick={()=>{frame.current?.contentWindow?.focus();frame.current?.contentWindow?.print();}}><FiPrinter/> Imprimir hoja</button>
  </div></Modal>;
}

function Scanner({onClose}:{onClose:()=>void}) {
  const router=useRouter(),video=useRef<HTMLVideoElement>(null);
  const [error,setError]=useState(''),[status,setStatus]=useState('Solicitando acceso a la cámara…'),[restart,setRestart]=useState(0);
  const [manual,setManual]=useState('');
  useEffect(()=>{
    let cancelled=false,matched=false;
    let controls:{stop:()=>void}|undefined,stream:MediaStream|undefined;
    const stop=()=>{controls?.stop();stream?.getTracks().forEach(track=>track.stop());};
    const hidden=()=>{if(document.hidden){cancelled=true;stop();setStatus('Cámara detenida. Pulsa reiniciar para continuar.');}};
    document.addEventListener('visibilitychange',hidden);
    setError('');setStatus('Solicitando acceso a la cámara…');
    async function start(){
      try {
        if(!navigator.mediaDevices?.getUserMedia) throw Error('La cámara necesita HTTPS o localhost. También puedes introducir el número EQ.');
        const [{BrowserMultiFormatReader},{BarcodeFormat,DecodeHintType}]=await Promise.all([import('@zxing/browser'),import('@zxing/library')]);
        if(cancelled)return;
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
        if(cancelled){stop();return;}
        controls=await new BrowserMultiFormatReader(new Map([[DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.CODE_128]]])).decodeFromStream(stream,video.current!,result=>{
          if(!result || matched || cancelled)return;
          const id=readEquipmentBarcode(result.getText());
          if(!id){setError('Esta barra no identifica un equipo de este inventario.');return;}
          matched=true;stop();onClose();router.push(equipmentPath(id));
        });
        if(cancelled || matched)stop();else setStatus('Apunta al código de barras completo. Mantén la cámara horizontal, estable y con buena luz.');
      } catch(error) {
        stop();
        if(!cancelled) {setStatus('Cámara no disponible');setError(error instanceof DOMException ? 'No pudimos abrir la cámara. Revisa sus permisos o introduce el número EQ.' : error instanceof Error ? error.message : 'No se pudo iniciar el escáner.');}
      }
    }
    void start();
    return()=>{cancelled=true;stop();document.removeEventListener('visibilitychange',hidden);};
    // Router is stable; closing is handled by the parent that mounted this scanner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[restart,router]);
  return <Modal title="Escanear etiqueta de equipo" onClose={onClose}><div className={s.record}>
    <video ref={video} className={s.camera} muted playsInline/>
    <p role="status">{status}</p>{error && <p role="alert" className={s.error}>{error}</p>}
    <button type="button" onClick={()=>setRestart(value=>value+1)}>Reiniciar cámara</button>
    <form onSubmit={event=>{event.preventDefault();const id=Number(manual);if(Number.isSafeInteger(id)&&id>0){onClose();router.push(equipmentPath(id));}}}>
      <label>O escribe el número EQ de la etiqueta<input type="number" min={1} step={1} required value={manual} onChange={event=>setManual(event.target.value)} placeholder="Ej. 123"/></label><button>Abrir ficha</button>
    </form>
  </div></Modal>;
}
