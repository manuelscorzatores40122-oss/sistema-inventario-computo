'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiAlertTriangle } from 'react-icons/fi';
import s from './EquipmentTools.module.css';
type Row={id:number; inventario_id:number; cantidad:number; equipo:string; profesor:string; telefono:string|null; vence:string};
export default function OverdueLoans() {
  const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState('');
  const load=useCallback(async(signal?:AbortSignal)=>{
    try {
      const response=await fetch('/api/admin/prestamos-vencidos',{cache:'no-store',signal});
      if(!response.ok) throw Error();
      const data=await response.json();
      setRows(data.prestamos || []); setError('');
    } catch {if (!signal?.aborted) setError('No pudimos comprobar los préstamos vencidos.');}
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    void load(controller.signal);
    const refresh=()=>{if(!document.hidden) void load(controller.signal);};
    const timer=window.setInterval(refresh,60000);
    window.addEventListener('focus',refresh);
    document.addEventListener('inventory-loans-changed',refresh);
    return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('inventory-loans-changed',refresh);};
  },[load]);
  if(error) return <div className={s.error} role="status">{error} <button onClick={()=>void load()}>Reintentar</button></div>;
  if(!rows.length) return null;
  return <section className={s.overdue} aria-label="Préstamos vencidos">
    <h2><FiAlertTriangle/> {rows.length} {rows.length===1?'préstamo sin devolver':'préstamos sin devolver'} después del plazo</h2>
    <p>Plazo: cierre de la jornada configurada; para entregas fuera de jornada, 24 horas. Se revisa cada minuto.</p>
    <div className={s.overdueList}>{rows.map(row=><article key={row.id}><div><strong>{row.profesor}</strong><p>{row.equipo} · {row.cantidad} unidades · Préstamo #{row.id}</p><small>Venció: {new Date(row.vence).toLocaleString('es-PE',{timeZone:'America/Lima'})}</small></div><div>{row.telefono?<a href={`tel:${row.telefono.replace(/[^\d+]/g,'')}`}>{row.telefono}</a>:<span>Sin teléfono registrado</span>}<Link href={`/admin/equipos/${row.inventario_id}`}>Abrir ficha y devolver →</Link></div></article>)}</div>
  </section>;
}
