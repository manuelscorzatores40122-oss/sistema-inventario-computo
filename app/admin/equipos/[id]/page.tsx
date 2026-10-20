import Link from 'next/link';
import { notFound } from 'next/navigation';
import EquipmentRecord from '@/app/components/equipment/EquipmentRecord';
export default function EquipmentPage({params}:{params:{id:string}}) {
  const id=Number(params.id);
  if (!Number.isSafeInteger(id) || id<=0) notFound();
  return <main style={{padding:'24px',maxWidth:1100,margin:'0 auto'}}><Link href="/admin/inventario">← Volver al inventario</Link><EquipmentRecord id={id}/></main>;
}
