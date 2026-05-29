'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Xo', 'Ve', 'Sá', 'Do'];

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

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

function formatToSpanishDate(isoStr) {
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
}

function parseSpanishDate(str) {
  if (!str) return null;
  // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  let match = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!match) {
    // Also support typing just digits like DDMMYYYY or DDMMYY
    const matchDigits = str.match(/^(\d{2})(\d{2})(\d{2,4})$/);
    if (matchDigits) {
      match = matchDigits;
    }
  }
  if (!match) return null;
  const d = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  let y = parseInt(match[3], 10);
  if (y < 100) {
    // assume 20xx for year < 50, 19xx for year >= 50
    y = y < 50 ? 2000 + y : 1900 + y;
  }
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
    return date;
  }
  return null;
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
 * Calendario custom con soporte de edición manual y selección rápida de mes/año.
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
  const [inputValue, setInputValue] = useState(() => formatToSpanishDate(value));
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const parsed = parseISODate(value);
    if (parsed) setViewMonth(parsed);
    setInputValue(formatToSpanishDate(value));
  }, [value]);

  function commitInput() {
    const parsed = parseSpanishDate(inputValue);
    if (parsed) {
      const iso = toISODateString(parsed);
      if (iso !== value) {
        onSelect(iso);
      }
    } else if (inputValue.trim() === '') {
      if (allowClear && value) {
        onSelect('');
      } else {
        setInputValue(formatToSpanishDate(value));
      }
    } else {
      setInputValue(formatToSpanishDate(value));
    }
  }

  useEffect(() => {
    if (!open) return;

    function onDocDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        commitInput();
        setOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === 'Escape') {
        setInputValue(formatToSpanishDate(value));
        setOpen(false);
        if (document.activeElement) {
          document.activeElement.blur();
        }
      }
    }

    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open, inputValue, value]);

  const cells = getMonthGrid(viewMonth);
  const todayISO = toISODateString(new Date());

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = 2015; y <= currentYear + 5; y++) {
    years.push(y);
  }

  function pickDay(day) {
    onSelect(toISODateString(day));
    setOpen(false);
  }

  function clearDate(e) {
    e.stopPropagation();
    onSelect('');
    setOpen(false);
  }

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    const parsed = parseSpanishDate(val);
    if (parsed) {
      setViewMonth(parsed);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitInput();
      setOpen(false);
      e.target.blur();
    }
  };

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value, 10);
    setViewMonth(new Date(viewMonth.getFullYear(), newMonth, 1));
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value, 10);
    setViewMonth(new Date(newYear, viewMonth.getMonth(), 1));
  };

  const handleMouseDown = (e) => {
    if (open && document.activeElement === inputRef.current) {
      e.preventDefault();
      setOpen(false);
      inputRef.current.blur();
    }
  };

  return (
    <div ref={rootRef} className="date-filter-field" data-date-field={name}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          id={id}
          className="date-filter-trigger-input"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onMouseDown={handleMouseDown}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
        <div style={{ position: 'absolute', right: '0.5rem', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <Calendar size={14} style={{ color: 'var(--brand-orange)' }} />
        </div>
      </div>

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
            
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <select
                value={viewMonth.getMonth()}
                onChange={handleMonthChange}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '0.15rem 0.3rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
              <select
                value={viewMonth.getFullYear()}
                onChange={handleYearChange}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '0.15rem 0.3rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

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

