'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminQuickForm from '../AdminQuickForm';
import { Modal, Pagination } from '../teacher/TeacherUi';
import { dateLabel } from '@/app/lib/teacher-utils';
import s from './EquipmentTools.module.css';

type Loan = { id:number; profesor:string; cantidad:number; estado:string; fecha_prestamo:string; fecha_devolucion:string|null; detalle:string|null; devolucion_observacion:string|null; devolucion_estado:string|null };
type RecordData = {
  equipo: { id:number; nombre:string; codigo_patrimonial:string|null; numero_serie:string|null; marca:string|null; modelo:string|null; ubicacion:string|null; fecha_ingreso:string|null; fecha_creacion:string; fecha_documento:string|null; observaciones:string|null; cantidad_disponible:number; cantidad_total:number; estado:string; condicion:string|null };
  prestamos:Loan[];
  eventos:{id:number; tipo_movimiento:string; descripcion:string|null; fecha:string; registrado_por:string; cantidad:number}[];
  activos:{id:number; estado:string; cantidad:number; profesor:string}[];
  totales:{prestamos:number; eventos:number};
};
const recordDate=(value:string)=>dateLabel(value,{day:'2-digit',month:'short',year:'numeric'});
const physical:Record<string,string> = { bueno:'En buen estado', regular:'Con desgaste', malo:'Necesita reparación' };
export default function EquipmentRecord({ id, onClose, onUpdated }: { id:number; onClose?:()=>void; onUpdated?:()=>void }) {
  const [data,setData]=useState<RecordData|null>(null), [error,setError]=useState(''), [loading,setLoading]=useState(true);
  const [loanPage,setLoanPage]=useState(1), [eventPage,setEventPage]=useState(1);
  const [quick,setQuick]=useState(false), [returnId,setReturnId]=useState<number|null>(null);
  const [condition,setCondition]=useState('bueno'), [observation,setObservation]=useState('');
  const [kind,setKind]=useState('observacion'), [description,setDescription]=useState(''), [date,setDate]=useState('');
  const [busy,setBusy]=useState(false), [notice,setNotice]=useState('');
  const load=useCallback(async () => {
    setLoading(true);
    try {
      const response=await fetch(`/api/inventario/${id}/historial?prestamos=${loanPage}&eventos=${eventPage}`, {cache:'no-store'});
      const body=await response.json();
      if (!response.ok) throw Error(body.error || 'No se pudo abrir la ficha.');
      setData(body); setError('');
    } catch(error) { setError(error instanceof Error ? error.message : 'No se pudo abrir la ficha.'); }
    finally { setLoading(false); }
  },[id,loanPage,eventPage]);
  useEffect(()=>{ void load(); },[load]);
  async function write(url:string,body:unknown,method='POST') {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok) throw Error(result.error || 'No se pudo guardar.');
      setNotice(result.message || 'Cambio guardado.'); setDescription(''); setReturnId(null); setObservation('');
      await load(); onUpdated?.();
    } catch(error) { setError(error instanceof Error?error.message:'No se pudo guardar.'); }
    finally {setBusy(false);}
  }
  const content=<div className={s.record} aria-busy={loading}>
    {error && <div role="alert" className={s.error}>{error} <button onClick={()=>void load()}>Reintentar</button></div>}
    {notice && <p role="status" className={s.success}>{notice}</p>}
    {!data && loading && <p>Cargando ficha e historial…</p>}
    {data && <>
      <header className={s.recordHeader}><div><small>FICHA TÉCNICA · EQ-{id}</small><h2>{data.equipo.nombre}</h2><p>{data.equipo.codigo_patrimonial || 'Sin código patrimonial'} · {data.equipo.cantidad_disponible} de {data.equipo.cantidad_total} unidades disponibles</p></div>
        <button disabled={busy || data.equipo.cantidad_disponible<1 || data.equipo.estado!=='disponible' || data.equipo.condicion==='malo'} onClick={()=>setQuick(true)}>Prestar equipo</button></header>
      {data.equipo.cantidad_total>1 && <p className={s.hint}>Esta ficha corresponde a un registro con varias unidades. El código de barras identifica el registro; no distingue cada unidad física.</p>}
      <dl className={s.facts}>
        <div><dt>Marca / modelo</dt><dd>{[data.equipo.marca,data.equipo.modelo].filter(Boolean).join(' · ') || 'Sin registrar'}</dd></div>
        <div><dt>Número de serie</dt><dd>{data.equipo.numero_serie || 'Sin registrar'}</dd></div>
        <div><dt>Ubicación</dt><dd>{data.equipo.ubicacion || 'Sin registrar'}</dd></div>
        <div><dt>Estado físico</dt><dd>{physical[data.equipo.condicion || ''] || 'Sin registrar'}</dd></div>
        <div><dt>Ingreso al colegio</dt><dd>{data.equipo.fecha_ingreso ? recordDate(data.equipo.fecha_ingreso) : 'Sin registrar: puedes añadirlo abajo'}</dd></div>
        <div><dt>Registrado en el sistema</dt><dd>{recordDate(data.equipo.fecha_creacion)}</dd></div>
        {data.equipo.fecha_documento && <div><dt>Fecha del documento</dt><dd>{recordDate(data.equipo.fecha_documento)}</dd></div>}
      </dl>
      {data.equipo.observaciones && <p className={s.hint}><strong>Observaciones del inventario:</strong> {data.equipo.observaciones}</p>}
      <section><h3>Préstamos activos</h3>
        {!data.activos.length && <p>No hay préstamos activos de este equipo.</p>}
        {data.activos.map(loan=><article className={s.historyRow} key={loan.id}><div><strong>{loan.profesor}</strong><p>#{loan.id} · {loan.cantidad} unidades · {loan.estado==='prestado'?'Entregado':'Pendiente de entrega'}</p></div>
          {loan.estado==='prestado'?<button disabled={busy} onClick={()=>{setReturnId(loan.id);setObservation('');setCondition('bueno');}}>Registrar devolución</button>:<Link href="/admin/prestamos">Gestionar entrega</Link>}</article>)}
      </section>
      {returnId && <form className={s.noteForm} onSubmit={event=>{event.preventDefault(); void write(`/api/prestamos/${returnId}`,{estado:'devuelto',devolucion_estado:condition,devolucion_observacion:observation},'PUT');}}>
        <h3>Devolver préstamo #{returnId}</h3><p>Confirma que recibiste físicamente el equipo antes de guardar.</p>
        <label>Estado al devolver<select value={condition} onChange={event=>setCondition(event.target.value)}>{Object.entries(physical).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label>Observaciones<textarea maxLength={1000} value={observation} onChange={event=>setObservation(event.target.value)} /></label>
        <div className={s.actions}><button disabled={busy}>{busy?'Guardando…':'Confirmar devolución'}</button><button type="button" disabled={busy} onClick={()=>setReturnId(null)}>Cancelar</button></div>
      </form>}
      <section><h3>Historial de préstamos <small>({data.totales.prestamos})</small></h3>
        {!data.prestamos.length && <p>No hay préstamos registrados.</p>}
        {data.prestamos.map(loan=><article className={s.historyRow} key={loan.id}><div><strong>#{loan.id} · {loan.profesor}</strong><p>{loan.cantidad} unidades · {recordDate(loan.fecha_prestamo)} · {loan.estado}</p>{loan.detalle && <p>{loan.detalle}</p>}{loan.fecha_devolucion && <p>Devuelto: {recordDate(loan.fecha_devolucion)} · {physical[loan.devolucion_estado || ''] || 'Sin evaluación'}</p>}{loan.devolucion_observacion && <p>Observación: {loan.devolucion_observacion}</p>}</div></article>)}
        <Pagination page={loanPage} size={20} total={data.totales.prestamos} onChange={setLoanPage}/>
      </section>
      <section><h3>Movimientos, reparaciones y observaciones <small>({data.totales.eventos})</small></h3>
        {!data.eventos.length && <p>No hay anotaciones históricas registradas.</p>}
        {data.eventos.map(event=><article className={s.historyRow} key={event.id}><div><strong>{({reparacion:'Reparación registrada',observacion:'Observación',ingreso:'Fecha de ingreso',entrada:'Entrada',salida:'Salida'} as Record<string,string>)[event.tipo_movimiento] || event.tipo_movimiento}</strong><p>{event.descripcion || 'Sin descripción'}</p><small>{recordDate(event.fecha)} · {event.registrado_por || 'Usuario no disponible'}</small></div></article>)}
        <Pagination page={eventPage} size={20} total={data.totales.eventos} onChange={setEventPage}/>
      </section>
      <form className={s.noteForm} onSubmit={(event:FormEvent)=>{event.preventDefault(); void write(`/api/inventario/${id}/historial`,{tipo:kind,descripcion:description,fecha_ingreso:date});}}>
        <h3>Añadir al historial</h3><p>Registrar una reparación documenta el trabajo realizado; no cambia las unidades ni habilita el equipo para préstamo.</p>
        <label>Tipo de anotación<select value={kind} onChange={event=>setKind(event.target.value)}><option value="observacion">Observación</option><option value="reparacion">Reparación realizada</option><option value="ingreso">Registrar fecha de ingreso</option></select></label>
        {kind==='ingreso' && <label>Fecha real de ingreso<input type="date" required value={date} onChange={event=>setDate(event.target.value)}/></label>}
        <label>Descripción o documento de referencia<textarea required maxLength={1000} value={description} onChange={event=>setDescription(event.target.value)}/></label>
        <button disabled={busy || !description.trim()}>{busy?'Guardando…':'Guardar anotación'}</button>
      </form>
    </>}
    {quick && <AdminQuickForm type="loan" initialEquipmentId={id} onClose={()=>setQuick(false)} onSaved={()=>{setQuick(false);void load();onUpdated?.();}}/>}
  </div>;
  return onClose?<Modal wide title="Ficha e historial del equipo" busy={busy} onClose={onClose}>{content}</Modal>:content;
}
