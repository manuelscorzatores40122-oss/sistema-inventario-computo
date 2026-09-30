'use client';

import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiPackage, FiSearch } from 'react-icons/fi';

type Article = { id: number; nombre: string; categoria: string; cantidad_disponible: number; estado: string };

type Props = {
  items: Article[];
  value: string;
  selectedId: number | null;
  loading: boolean;
  onChange: (value: string) => void;
  onSelect: (item: Article) => void;
};

export default function ArticleAutocomplete({ items, value, selectedId, loading, onChange, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const available = (item: Article) => item.cantidad_disponible > 0 && item.estado === 'disponible';
  const selectable = items.filter(available);
  const active = items.find(item => item.id === activeId && available(item));

  useEffect(() => {
    if (open && activeId !== null) {
      list.current?.querySelector(`[id="article-option-${activeId}"]`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeId, open]);

  const choose = (item: Article) => {
    if (!available(item)) return;
    onSelect(item);
    input.current?.focus();
    setOpen(false);
    setActiveId(null);
  };

  return (
    <div className="request-article-combobox" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActiveId(null); }
    }}>
      <div className="request-article-search">
        <FiSearch size={18} aria-hidden="true" />
        <input ref={input} id="request-item" type="search" role="combobox" autoComplete="off"
          value={value} aria-autocomplete="list" aria-expanded={open} aria-controls={open ? 'article-options' : undefined}
          aria-activedescendant={open && active ? `article-option-${active.id}` : undefined}
          onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
          onChange={event => { onChange(event.target.value); setOpen(true); setActiveId(null); }}
          onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); setActiveId(null); }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              if (!selectable.length) return;
              const index = selectable.findIndex(item => item.id === activeId);
              const next = event.key === 'ArrowDown' ? (index + 1) % selectable.length : (index < 0 ? selectable.length - 1 : (index - 1 + selectable.length) % selectable.length);
              setActiveId(selectable[next].id);
            }
            if (event.key === 'Enter' && open) { event.preventDefault(); if (active) choose(active); }
          }}
          className="inventory-form-input" placeholder="Buscar artículo, ej. proyector" />
      </div>
      {open && (
        <div className="request-article-dropdown">
          <p className="request-article-dropdown-label" role="status">{loading ? 'Buscando artículos…' : items.length ? `${items.length} artículo${items.length !== 1 ? 's' : ''} encontrado${items.length !== 1 ? 's' : ''}` : 'No encontramos artículos. Prueba con otro nombre.'}</p>
          <div ref={list} id="article-options" role="listbox" aria-label="Artículos encontrados" aria-busy={loading} className="request-article-options">
            {!loading && items.map(item => (
              <button key={item.id} id={`article-option-${item.id}`} type="button" role="option" tabIndex={-1}
                aria-selected={selectedId === item.id} aria-disabled={!available(item)}
                className={`request-article-option ${activeId === item.id ? 'is-active' : ''}`}
                onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}>
                <FiPackage size={19} aria-hidden="true" />
                <span><strong>{item.nombre}</strong><small>{item.categoria}{item.categoria ? ' · ' : ''}{available(item) ? `${item.cantidad_disponible} disponibles` : 'No disponible'}</small></span>
                {selectedId === item.id && <FiCheck size={18} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
