'use client';

import { useRouter } from 'next/navigation';
import { useRef, useEffect, useState } from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import { getLocalTodayISO, isDateRangeInverted } from '../lib/dateRange';
import { formatPrioridadOption, sortPrioridadesForFilter } from '../lib/prioridad';
import { useFilterNav } from './FilterNavContext';

export default function FilterForm({ filters, metadata, tipoLabels }) {
  const router = useRouter();
  const { startTransition } = useFilterNav();
  const formRef = useRef(null);
  const [rangeError, setRangeError] = useState(null);
  const editingDatesRef = useRef(false);
  const skipDateBlurCommitRef = useRef(false);
  const [dateDraft, setDateDraft] = useState({
    fechaInicio: filters.fechaInicio || '',
    fechaFin: filters.fechaFin || '',
  });

  // Forzar blur ao pinchar fóra: o calendario nativo a veces non pecha só.
  useEffect(() => {
    function handlePointerDown(e) {
      const active = document.activeElement;
      if (active?.type !== 'date') return;
      if (active === e.target) return;
      active.blur();
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  // Sincroniza os inputs coa URL. Datas en borrador mentres se edita o calendario.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const syncInput = (name, expected) => {
      const value = expected ?? '';
      if (form[name] && form[name].value !== value) {
        form[name].value = value;
      }
    };

    if (!editingDatesRef.current) {
      setDateDraft({
        fechaInicio: filters.fechaInicio || '',
        fechaFin: filters.fechaFin || '',
      });
    }

    syncInput('tecnico', filters.tecnico || 'TODOS');
    syncInput('tipo', filters.tipo || 'TODOS');
    syncInput('prioridad', filters.prioridad || 'TODAS');
    syncInput('cliente', filters.cliente);
    syncInput('telefono', filters.telefono);
    setRangeError(null);
  }, [
    filters.tecnico,
    filters.fechaInicio,
    filters.fechaFin,
    filters.tipo,
    filters.prioridad,
    filters.cliente,
    filters.telefono,
  ]);

  function applyFiltersFromForm(form) {
    const formData = new FormData(form);
    const fechaInicio = formData.get('fechaInicio');
    const fechaFin = formData.get('fechaFin');

    if (isDateRangeInverted(fechaInicio, fechaFin)) {
      setRangeError('A data "Ata" debe ser posterior ou igual á data "Desde".');
      return;
    }
    setRangeError(null);

    const searchParams = new URLSearchParams();

    for (let [key, value] of formData.entries()) {
      if (value && value !== 'TODOS' && value !== 'TODAS' && value !== '') {
        searchParams.set(key, value);
      }
    }

    startTransition(() => {
      router.push(`/?${searchParams.toString()}`);
    });
  }

  // Solo selects: aplicar ao cambiar no form onChange.
  function handleFormChange(e) {
    if (e.target.tagName !== 'SELECT') return;
    applyFiltersFromForm(e.currentTarget);
  }

  // Datas en borrador: cambiar mes no dispara carga (só ao blur / Enter).
  function handleDateDraftChange(e) {
    const { name, value } = e.target;
    setDateDraft((prev) => ({ ...prev, [name]: value }));
  }

  function commitDateFilters() {
    const form = formRef.current;
    if (!form) return;

    const inicio = dateDraft.fechaInicio || '';
    const fin = dateDraft.fechaFin || '';
    if (
      inicio === (filters.fechaInicio || '') &&
      fin === (filters.fechaFin || '')
    ) {
      return;
    }

    form.fechaInicio.value = inicio;
    form.fechaFin.value = fin;
    applyFiltersFromForm(form);
  }

  function handleDateFocus() {
    editingDatesRef.current = true;
  }

  function handleDateBlur() {
    editingDatesRef.current = false;
    if (skipDateBlurCommitRef.current) {
      skipDateBlurCommitRef.current = false;
      return;
    }
    commitDateFilters();
  }

  function handleDateKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      skipDateBlurCommitRef.current = true;
      commitDateFilters();
      e.target.blur();
    }
  }

  // Texto: buscar ao pulsar Enter ou ao sair do campo (blur).
  function handleDeferredFilterCommit(e) {
    const form = formRef.current;
    if (!form) return;

    const name = e.target.name;
    const newVal = String(e.target.value ?? '').trim();
    const urlVal = String(filters[name] ?? '').trim();
    if (e.type === 'blur' && newVal === urlVal) return;

    applyFiltersFromForm(form);
  }

  function handleDeferredKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDeferredFilterCommit(e);
      e.target.blur();
    }
  }

  function handleClear() {
    const today = getLocalTodayISO();
    if (formRef.current) {
      const form = formRef.current;
      form.tecnico.value = 'TODOS';
      form.fechaInicio.value = today;
      form.fechaFin.value = '';
      form.tipo.value = 'TODOS';
      form.prioridad.value = 'TODAS';
      form.cliente.value = '';
      form.telefono.value = '';
    }
    setDateDraft({ fechaInicio: today, fechaFin: '' });
    startTransition(() => {
      router.push('/');
    });
  }

  const togglePicker = (id) => {
    const el = document.getElementById(id);
    if (el) {
      if (document.activeElement === el) {
        el.blur();
      } else {
        el.showPicker();
      }
    }
  };

  return (
    <>
      {rangeError && (
        <p className="filter-range-error" role="alert">
          {rangeError}
        </p>
      )}

      <form
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
          transition: 'all 0.2s',
        }}
      >
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>Técnico</label>
          <select name="tecnico" defaultValue={filters.tecnico} style={{ width: '100%', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem' }}>
            <option value="TODOS">TODOS</option>
            {metadata.tecnicos.map((t) => (
              <option key={t.abbr} value={t.abbr}>
                {t.full || t.abbr}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '0 0 120px' }}>
          <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <Calendar size={10} /> DENDE
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="date"
              name="fechaInicio"
              value={dateDraft.fechaInicio}
              id="fechaInicio"
              onFocus={handleDateFocus}
              onClick={(e) => e.target.showPicker()}
              onChange={handleDateDraftChange}
              onBlur={handleDateBlur}
              onKeyDown={handleDateKeyDown}
              style={{ width: '100%', padding: '0.3rem', paddingRight: '1.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem', cursor: 'pointer', outline: 'none' }}
            />
            <span
              onClick={() => togglePicker('fechaInicio')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--brand-orange)', pointerEvents: 'none' }}
            >
              <Calendar size={14} />
            </span>
          </div>
        </div>
        <div style={{ flex: '0 0 120px' }}>
          <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <Calendar size={10} /> ATA
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="date"
              name="fechaFin"
              value={dateDraft.fechaFin}
              id="fechaFin"
              onFocus={handleDateFocus}
              onClick={(e) => e.target.showPicker()}
              onChange={handleDateDraftChange}
              onBlur={handleDateBlur}
              onKeyDown={handleDateKeyDown}
              style={{ width: '100%', padding: '0.3rem', paddingRight: '1.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem', cursor: 'pointer', outline: 'none' }}
            />
            <span
              onClick={() => togglePicker('fechaFin')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--brand-orange)', pointerEvents: 'none' }}
            >
              <Calendar size={14} />
            </span>
          </div>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>Tipo</label>
          <select name="tipo" defaultValue={filters.tipo} style={{ width: '100%', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem' }}>
            <option value="TODOS">TODOS</option>
            {metadata.tipos.map((t) => (
              <option key={t} value={t}>
                {tipoLabels[t] || t}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1 1 80px' }}>
          <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>Prioridade</label>
          <select name="prioridad" defaultValue={filters.prioridad} style={{ width: '100%', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem' }}>
            <option value="TODAS">TODAS</option>
            {sortPrioridadesForFilter(metadata.prioridades).map((p) => (
              <option key={p} value={p}>
                {formatPrioridadOption(p)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '2 1 180px' }}>
          <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>Cliente / Aviso</label>
          <input
            type="text"
            name="cliente"
            defaultValue={filters.cliente}
            placeholder="Cli..."
            onBlur={handleDeferredFilterCommit}
            onKeyDown={handleDeferredKeyDown}
            style={{ width: '100%', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem' }}
          />
        </div>
        <div style={{ flex: '1 1 100px' }}>
          <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>Teléfono</label>
          <input
            type="text"
            name="telefono"
            defaultValue={filters.telefono}
            placeholder="Tlf..."
            onBlur={handleDeferredFilterCommit}
            onKeyDown={handleDeferredKeyDown}
            style={{ width: '100%', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.2rem' }}>
          <button
            type="button"
            onClick={handleClear}
            style={{ padding: '0.4rem 0.6rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <Trash2 size={12} /> LIMPIAR
          </button>
        </div>
      </form>
    </>
  );
}
