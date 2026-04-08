'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useRef, useState } from 'react';

export default function FilterForm({ filters, metadata, tipoLabels }) {
  const router = useRouter();
  const timeoutRef = useRef(null);
  const formRef = useRef(null);
  const [formKey, setFormKey] = useState(Date.now());

  function handleFormChange(e) {
    const form = e.currentTarget;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const isTextInput = e.target.type === 'text';
    const delay = isTextInput ? 400 : 0;

    timeoutRef.current = setTimeout(() => {
      const formData = new FormData(form);
      const searchParams = new URLSearchParams();
      
      for (let [key, value] of formData.entries()) {
        if (value && value !== 'TODOS' && value !== 'TODAS' && value !== '') {
          searchParams.set(key, value);
        }
      }

      router.push(`/?${searchParams.toString()}`);
    }, delay);
  }

  function handleClear() {
    const today = new Date().toISOString().split('T')[0];
    if (formRef.current) {
      const form = formRef.current;
      form.tecnico.value = 'TODOS';
      form.fechaInicio.value = today;
      form.fechaFin.value = today;
      form.tipo.value = 'TODOS';
      form.prioridad.value = 'TODAS';
      form.cliente.value = '';
      form.telefono.value = '';
    }
    router.push('/');
  }

  const togglePicker = (id) => {
    const el = document.getElementById(id);
    if (el) {
      // Intentamos alternar el foco para que algunos navegadores cierren/abran
      if (document.activeElement === el) {
        el.blur();
      } else {
        el.showPicker();
      }
    }
  };

  return (
    <form 
      key={formKey}
      ref={formRef}
      onChange={handleFormChange} 
      onSubmit={(e) => e.preventDefault()} 
      style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '0.4rem', 
        padding: '0.4rem',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        alignItems: 'flex-end',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ flex: '1 1 140px' }}>
        <label style={{display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem'}}>Técnico</label>
        <select name="tecnico" defaultValue={filters.tecnico} style={{width: '100%', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem'}}>
          <option value="TODOS">TODOS</option>
          {metadata.tecnicos.map(t => (
            <option key={t.abbr} value={t.abbr}>{t.full || t.abbr}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: '0 0 120px' }}>
        <label style={{display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem'}}>📅 Dende</label>
        <div style={{ position: 'relative' }}>
          <input
            type="date"
            name="fechaInicio"
            defaultValue={filters.fechaInicio}
            id="fechaInicio"
            style={{width: '100%', padding: '0.3rem', paddingRight: '1.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem', cursor: 'pointer'}}
          />
          <span
            onClick={() => togglePicker('fechaInicio')}
            style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '0.9rem', pointerEvents: 'all', userSelect: 'none', zIndex: 10 }}
          >📅</span>
        </div>
      </div>
      <div style={{ flex: '0 0 120px' }}>
        <label style={{display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem'}}>📅 Ata</label>
        <div style={{ position: 'relative' }}>
          <input
            type="date"
            name="fechaFin"
            defaultValue={filters.fechaFin}
            id="fechaFin"
            style={{width: '100%', padding: '0.3rem', paddingRight: '1.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem', cursor: 'pointer'}}
          />
          <span
            onClick={() => togglePicker('fechaFin')}
            style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '0.9rem', pointerEvents: 'all', userSelect: 'none', zIndex: 10 }}
          >📅</span>
        </div>
      </div>
      <div style={{ flex: '1 1 140px' }}>
        <label style={{display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem'}}>Tipo</label>
        <select name="tipo" defaultValue={filters.tipo} style={{width: '100%', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem'}}>
          <option value="TODOS">TODOS</option>
          {metadata.tipos.map(t => (
            <option key={t} value={t}>{tipoLabels[t] || t}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: '1 1 80px' }}>
        <label style={{display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem'}}>Prioridade</label>
        <select name="prioridad" defaultValue={filters.prioridad} style={{width: '100%', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem'}}>
          <option value="TODAS">TODAS</option>
          {metadata.prioridades.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: '2 1 180px' }}>
        <label style={{display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem'}}>Cliente / Aviso</label>
        <input type="text" name="cliente" defaultValue={filters.cliente} placeholder="Cli..." style={{width: '100%', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem'}} />
      </div>
      <div style={{ flex: '1 1 100px' }}>
        <label style={{display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem'}}>Teléfono</label>
        <input type="text" name="telefono" defaultValue={filters.telefono} placeholder="Tlf..." style={{width: '100%', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem'}} />
      </div>
      <div style={{ display: 'flex', gap: '0.2rem' }}>
        <button type="button" onClick={handleClear} style={{ padding: '0.4rem 0.6rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>LIMPIAR FILTROS</button>
      </div>
    </form>
  );
}
