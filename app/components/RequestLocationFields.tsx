'use client';

import { useId } from 'react';

export type RequestLocation = { seccion: string; numero_aula: string };
export const emptyRequestLocation: RequestLocation = { seccion: '', numero_aula: '' };

export function formatRequestLocation(value: { seccion?: string | null; numero_aula?: string | null }) {
  return [value.seccion && `Sección: ${value.seccion}`, value.numero_aula && `Aula: ${value.numero_aula}`].filter(Boolean).join(' · ');
}

export default function RequestLocationFields({ value, onChange }: {
  value: RequestLocation;
  onChange: (value: RequestLocation) => void;
}) {
  const id = useId();
  return (
    <fieldset className="request-location-fields">
      <legend>¿Dónde lo usarás?</legend>
      <p id={`${id}-help`}>Completa la sección o el número de aula.</p>
      <div className="request-location-inputs">
        <div>
          <label htmlFor={`${id}-section`}>Sección</label>
          <input id={`${id}-section`} className="inventory-form-input" value={value.seccion} maxLength={60}
            placeholder="Ej.: 2.º B" aria-describedby={`${id}-help`}
            onChange={event => onChange({ ...value, seccion: event.target.value })} />
        </div>
        <span aria-hidden="true">o</span>
        <div>
          <label htmlFor={`${id}-room`}>Número de aula</label>
          <input id={`${id}-room`} className="inventory-form-input" value={value.numero_aula} maxLength={30}
            placeholder="Ej.: 201" aria-describedby={`${id}-help`}
            onChange={event => onChange({ ...value, numero_aula: event.target.value })} />
        </div>
      </div>
    </fieldset>
  );
}
