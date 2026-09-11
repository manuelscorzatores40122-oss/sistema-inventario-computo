'use client';

import { useEffect, useState } from 'react';

type Disponibilidad = {
  id: number;
  sala_nombre: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  reservado_por: number | null;
  reservado_por_nombre: string | null;
  reservado_por_apellido: string | null;
  motivo_reserva: string | null;
  fecha_reserva: string | null;
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function AdminHorarioView() {
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/disponibilidad')
      .then(res => res.json())
      .then(data => setDisponibilidades(data.disponibilidades || []))
      .catch(() => console.error('Error al cargar'))
      .finally(() => setLoading(false));
  }, []);

  const porDia = DIAS.map(dia => ({
    dia,
    slots: disponibilidades
      .filter(d => d.dia_semana === dia)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
  }));

  if (loading) return <p>Cargando horario…</p>;
  if (disponibilidades.length === 0) return <p>Sin horarios registrados</p>;

  return (
    <div>
      <h1>Horario Semanal</h1>
      <table border={1} cellPadding={8} cellSpacing={0}>
        <thead>
          <tr>
            {DIAS.map(d => <th key={d}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            {porDia.map(({ dia, slots }) => (
              <td key={dia}>
                {slots.length === 0 ? (
                  <p>Sin horarios</p>
                ) : (
                  slots.map(slot => (
                    <div key={slot.id} style={{ marginBottom: 8 }}>
                      <strong>{slot.hora_inicio} – {slot.hora_fin}</strong>
                      <br />
                      {slot.sala_nombre}
                      <br />
                      {slot.estado === 'separado' ? (
                        <span>
                          RESERVADO — {slot.reservado_por_nombre} {slot.reservado_por_apellido}
                          {slot.motivo_reserva && <> | {slot.motivo_reserva}</>}
                        </span>
                      ) : (
                        <span>DISPONIBLE</span>
                      )}
                    </div>
                  ))
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
