'use client';

import { useRouter } from 'next/navigation';
import { useRef, useEffect, useState } from 'react';
import { Calendar, SlidersHorizontal } from 'lucide-react';
import { getLocalTodayISO, isDateRangeInverted } from '../lib/dateRange';
import { formatPrioridadOption, sortPrioridadesForFilter } from '../lib/prioridad';
import { useFilterNav } from './FilterNavContext';
import DateFilterField from './DateFilterField';
import CustomSelect from './CustomSelect';


export default function FilterForm({ filters, metadata, tipoLabels }) {
  const router = useRouter();
  const { startTransition } = useFilterNav();
  const formRef = useRef(null);
  const [rangeError, setRangeError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.tecnico && filters.tecnico !== 'TODOS') count++;
    if (filters.tipo && filters.tipo !== 'TODOS') count++;
    if (filters.prioridad && filters.prioridad !== 'TODAS') count++;
    if (filters.cliente && filters.cliente.trim() !== '') count++;
    if (filters.telefono && filters.telefono.trim() !== '') count++;
    
    const today = getLocalTodayISO();
    const isDefaultDate = (filters.fechaInicio === today && !filters.fechaFin);
    if (!isDefaultDate && (filters.fechaInicio || filters.fechaFin)) {
      count++;
    }
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  // Sincroniza selects/texto coa URL (datas van por DateFilterField + hidden inputs).
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const syncInput = (name, expected) => {
      const value = expected ?? '';
      if (form[name] && form[name].value !== value) {
        form[name].value = value;
      }
    };

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

  /**
   * @param {HTMLFormElement} form
   * @param {{ fechaInicio?: string, fechaFin?: string }} dateOverrides — datas escollidas no calendario (evita input hidden controlado por React)
   */
  function applyFiltersFromForm(form, dateOverrides = {}) {
    const formData = new FormData(form);

    const fechaInicio =
      dateOverrides.fechaInicio !== undefined
        ? dateOverrides.fechaInicio
        : filters.fechaInicio || '';
    const fechaFin =
      dateOverrides.fechaFin !== undefined
        ? dateOverrides.fechaFin
        : filters.fechaFin || '';

    if (isDateRangeInverted(fechaInicio, fechaFin)) {
      setRangeError('A data "Ata" debe ser posterior ou igual á data "Desde".');
      return;
    }
    setRangeError(null);

    const searchParams = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      if (value && value !== 'TODOS' && value !== 'TODAS' && value !== '') {
        searchParams.set(key, value);
      }
    }

    if (fechaInicio) searchParams.set('fechaInicio', fechaInicio);
    if (fechaFin) searchParams.set('fechaFin', fechaFin);

    startTransition(() => {
      router.push(`/?${searchParams.toString()}`);
    });
  }

  function handleCustomSelectChange() {
    applyFiltersFromForm(formRef.current);
  }

  function handleDateSelect(name, isoDate) {
    const form = formRef.current;
    if (!form) return;

    const urlVal =
      name === 'fechaInicio' ? filters.fechaInicio || '' : filters.fechaFin || '';
    if (isoDate === urlVal) return;

    const dateOverrides = { [name]: isoDate };
    applyFiltersFromForm(form, dateOverrides);
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

  function handleSetToday() {
    const form = formRef.current;
    if (!form) return;
    const today = getLocalTodayISO();
    applyFiltersFromForm(form, { fechaInicio: today, fechaFin: '' });
  }

  return (
    <>
      {rangeError && (
        <p className="filter-range-error" role="alert">
          {rangeError}
        </p>
      )}

      <form
        ref={formRef}
        onSubmit={(e) => e.preventDefault()}
        className="filter-form"
      >
        {/* Botón de control de filtros para móvil */}
        <button
          type="button"
          className="mobile-filters-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <SlidersHorizontal size={14} />
          <span>{isExpanded ? 'Ocultar filtros' : 'Amosar filtros'}</span>
          {activeFiltersCount > 0 && (
            <span className="active-filters-badge">{activeFiltersCount}</span>
          )}
        </button>

        {/* Contedor de campos dos filtros */}
        <div className={`filter-form-fields ${isExpanded ? 'is-expanded' : ''}`}>
          {/* Técnico — bloque individual á esquerda da data */}
          <div className="filter-group filter-group-tecnico">
            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Técnico</label>
              <CustomSelect
                name="tecnico"
                value={filters.tecnico || 'TODOS'}
                options={[
                  { value: 'TODOS', label: 'TODOS' },
                  ...metadata.tecnicos.map(t => ({ value: t.abbr, label: t.full || t.abbr })),
                ]}
                onSelect={handleCustomSelectChange}
              />
            </div>
          </div>

          {/* Grupo fechas: DENDE + ATA + HOXE agrupados visualmente */}
          <div className="filter-group filter-group-date">
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                <Calendar size={10} /> DENDE
              </label>
              <DateFilterField
                id="fechaInicio"
                name="fechaInicio"
                value={filters.fechaInicio || ''}
                placeholder="Día"
                onSelect={(iso) => handleDateSelect('fechaInicio', iso)}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                <Calendar size={10} /> ATA
              </label>
              <DateFilterField
                id="fechaFin"
                name="fechaFin"
                value={filters.fechaFin || ''}
                placeholder="Opcional"
                allowClear
                onSelect={(iso) => handleDateSelect('fechaFin', iso)}
              />
            </div>
            <button
              type="button"
              onClick={handleSetToday}
              className="theme-toggle-btn hoxe-btn"
            >
              HOXE
            </button>
          </div>

          {/* Grupo selects: Tipo + Prioridade */}
          <div className="filter-group filter-group-type-priority">
            <div className="filter-type-wrapper">
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Tipo</label>
              <CustomSelect
                name="tipo"
                value={filters.tipo || 'TODOS'}
                options={[
                  { value: 'TODOS', label: 'TODOS' },
                  ...metadata.tipos.map(t => ({ value: t, label: tipoLabels[t] || t })),
                ]}
                onSelect={handleCustomSelectChange}
              />
            </div>
            <div className="filter-priority-wrapper">
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Prioridade</label>
              <CustomSelect
                name="prioridad"
                value={filters.prioridad || 'TODAS'}
                options={[
                  { value: 'TODAS', label: 'TODAS' },
                  ...sortPrioridadesForFilter(metadata.prioridades).map(p => ({ value: p, label: formatPrioridadOption(p) })),
                ]}
                onSelect={handleCustomSelectChange}
              />
            </div>
          </div>

          {/* Grupo busca: Cliente + Teléfono */}
          <div className="filter-group filter-group-search">
            <div className="filter-search-cliente">
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Cliente / Aviso</label>
              <input
                type="text"
                name="cliente"
                defaultValue={filters.cliente}
                placeholder="Cli..."
                onBlur={handleDeferredFilterCommit}
                onKeyDown={handleDeferredKeyDown}
                className="date-filter-trigger-input"
                style={{ cursor: 'text' }}
              />
            </div>
            <div className="filter-search-telefono">
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>Teléfono</label>
              <input
                type="text"
                name="telefono"
                defaultValue={filters.telefono}
                placeholder="Tlf..."
                onBlur={handleDeferredFilterCommit}
                onKeyDown={handleDeferredKeyDown}
                className="date-filter-trigger-input"
                style={{ cursor: 'text', width: 'calc(9ch + 2.2rem)' }}
              />
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
