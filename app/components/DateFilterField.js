'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';

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
  let match = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!match) {
    const matchDigits = str.match(/^(\d{2})(\d{2})(\d{2,4})$/);
    if (matchDigits) match = matchDigits;
  }
  if (!match) return null;
  const d = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  let y = parseInt(match[3], 10);
  if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) return date;
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

export default function DateFilterField({
  id,
  name,
  value = '',
  onSelect,
  placeholder = 'Escoller…',
  allowClear = false,
}) {
  const [open, setOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const selected = parseISODate(value);
  const [viewMonth, setViewMonth] = useState(() => selected || new Date());
  const [inputValue, setInputValue] = useState(() => formatToSpanishDate(value));
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const monthListRef = useRef(null);
  const yearListRef = useRef(null);

  useEffect(() => {
    const parsed = parseISODate(value);
    if (parsed) setViewMonth(parsed);
    setInputValue(formatToSpanishDate(value));
  }, [value]);

  function commitInput() {
    const parsed = parseSpanishDate(inputValue);
    if (parsed) {
      const iso = toISODateString(parsed);
      if (iso !== value) onSelect(iso);
    } else if (inputValue.trim() === '') {
      if (allowClear && value) onSelect('');
      else setInputValue(formatToSpanishDate(value));
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
        setMonthOpen(false);
        setYearOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === 'Escape') {
        if (monthOpen) { setMonthOpen(false); return; }
        if (yearOpen) { setYearOpen(false); return; }
        setInputValue(formatToSpanishDate(value));
        setOpen(false);
        if (document.activeElement) document.activeElement.blur();
      }
    }

    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open, monthOpen, yearOpen, inputValue, value]);

  // Scroll al elemento activo cuando se abre un sub-dropdown
  useEffect(() => {
    if (monthOpen && monthListRef.current) {
      const active = monthListRef.current.querySelector('.is-active');
      if (active) active.scrollIntoView({ block: 'nearest' });
    }
  }, [monthOpen]);

  useEffect(() => {
    if (yearOpen && yearListRef.current) {
      const active = yearListRef.current.querySelector('.is-active');
      if (active) active.scrollIntoView({ block: 'nearest' });
    }
  }, [yearOpen]);

  const cells = getMonthGrid(viewMonth);
  const todayISO = toISODateString(new Date());

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = 2015; y <= currentYear + 5; y++) years.push(y);

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
    if (parsed) setViewMonth(parsed);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitInput();
      setOpen(false);
      e.target.blur();
    }
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
          style={{ width: 'calc(10ch + 2.2rem)' }}
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
              {/* Selector de mes custom */}
              <div className="dfp-picker-wrap">
                <button
                  type="button"
                  className={`dfp-picker-btn${monthOpen ? ' is-open' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setMonthOpen(v => !v); setYearOpen(false); }}
                  aria-haspopup="listbox"
                  aria-expanded={monthOpen}
                >
                  {MONTHS[viewMonth.getMonth()]}
                  <ChevronDown size={10} className="dfp-chevron" />
                </button>
                {monthOpen && (
                  <div className="dfp-dropdown" role="listbox" ref={monthListRef}>
                    {MONTHS.map((m, idx) => (
                      <button
                        key={m}
                        type="button"
                        role="option"
                        aria-selected={idx === viewMonth.getMonth()}
                        className={`dfp-option${idx === viewMonth.getMonth() ? ' is-active' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setViewMonth(new Date(viewMonth.getFullYear(), idx, 1));
                          setMonthOpen(false);
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selector de año custom */}
              <div className="dfp-picker-wrap">
                <button
                  type="button"
                  className={`dfp-picker-btn${yearOpen ? ' is-open' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setYearOpen(v => !v); setMonthOpen(false); }}
                  aria-haspopup="listbox"
                  aria-expanded={yearOpen}
                >
                  {viewMonth.getFullYear()}
                  <ChevronDown size={10} className="dfp-chevron" />
                </button>
                {yearOpen && (
                  <div className="dfp-dropdown dfp-dropdown--year" role="listbox" ref={yearListRef}>
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        role="option"
                        aria-selected={y === viewMonth.getFullYear()}
                        className={`dfp-option${y === viewMonth.getFullYear() ? ' is-active' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setViewMonth(new Date(y, viewMonth.getMonth(), 1));
                          setYearOpen(false);
                        }}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
