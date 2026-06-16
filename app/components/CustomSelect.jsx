'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * @param {{ name: string, value: string, options: {value: string, label: string}[], onSelect: (v: string) => void }} props
 */
export default function CustomSelect({ name, value, options, onSelect }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const hiddenRef = useRef(null);

  // Sync hidden input when prop value changes (URL navigation)
  useEffect(() => {
    if (hiddenRef.current) hiddenRef.current.value = value;
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onEsc(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  function handlePick(optionValue) {
    if (hiddenRef.current) hiddenRef.current.value = optionValue;
    setOpen(false);
    onSelect(optionValue);
  }

  const currentLabel = options.find(o => o.value === value)?.label ?? value;

  return (
    <div ref={rootRef} className="custom-select">
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={value} />
      <button
        type="button"
        className="custom-select-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(v => !v)}
      >
        <span>{currentLabel}</span>
        <ChevronDown size={12} className="custom-select-chevron" />
      </button>

      {open && (
        <div className="custom-select-popover">
        <ul className="custom-select-list" role="listbox">
          {options.map(opt => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`custom-select-option${opt.value === value ? ' is-selected' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handlePick(opt.value)}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={11} />}
            </li>
          ))}
        </ul>
        </div>
      )}
    </div>
  );
}
