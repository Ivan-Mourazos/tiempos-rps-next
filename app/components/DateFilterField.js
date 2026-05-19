'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Xo', 'Ve', 'Sá', 'Do'];

function pad(n) {
  return String(n).padStart(2, '0');
}

export function toISODateString(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISODate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getMonthGrid(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

/**
 * Calendario custom (evita o picker nativo de Chromium/Brave que pecha ao cambiar mes).
 */
export default function DateFilterField({
  id,
  name,
  value = '',
  onSelect,
  placeholder = 'Escoller…',
  allowClear = false,
}) {
  const [open, setOpen] = useState(false);
  const selected = parseISODate(value);
  const [viewMonth, setViewMonth] = useState(() => selected || new Date());
  const rootRef = useRef(null);

  useEffect(() => {
    const parsed = parseISODate(value);
    if (parsed) setViewMonth(parsed);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    function onDocDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const display = selected
    ? selected.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  const monthLabelRaw = viewMonth.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);

  const cells = getMonthGrid(viewMonth);
  const todayISO = toISODateString(new Date());

  function pickDay(day) {
    onSelect(toISODateString(day));
    setOpen(false);
  }

  function clearDate(e) {
    e.stopPropagation();
    onSelect('');
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="date-filter-field" data-date-field={name}>
      <button
        type="button"
        id={id}
        className="date-filter-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={display ? 'date-filter-trigger-value' : 'date-filter-trigger-placeholder'}>
          {display || placeholder}
        </span>
        <Calendar size={14} aria-hidden />
      </button>

      {open && (
        <div className="date-filter-popover" role="dialog" aria-label="Calendario">
          <div className="date-filter-popover-header">
            <button
              type="button"
              className="date-filter-nav-btn"
              aria-label="Mes anterior"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="date-filter-month-label">{monthLabel}</span>
            <button
              type="button"
              className="date-filter-nav-btn"
              aria-label="Mes seguinte"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="date-filter-weekdays" aria-hidden>
            {WEEKDAYS.map((wd) => (
              <span key={wd}>{wd}</span>
            ))}
          </div>

          <div className="date-filter-grid">
            {cells.map((day, i) =>
              day ? (
                <button
                  key={toISODateString(day)}
                  type="button"
                  className={[
                    'date-filter-day',
                    value === toISODateString(day) ? 'is-selected' : '',
                    todayISO === toISODateString(day) ? 'is-today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => pickDay(day)}
                >
                  {day.getDate()}
                </button>
              ) : (
                <span key={`empty-${i}`} className="date-filter-day-empty" />
              )
            )}
          </div>

          {allowClear && value && (
            <button type="button" className="date-filter-clear" onClick={clearDate}>
              <X size={12} aria-hidden /> Limpar data
            </button>
          )}
        </div>
      )}
    </div>
  );
}
