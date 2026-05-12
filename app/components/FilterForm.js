'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useRef, useEffect } from 'react';
import { Calendar, Trash2 } from 'lucide-react';

export default function FilterForm({ filters, metadata, tipoLabels }) {
  const router = useRouter();
  const timeoutRef = useRef(null);
  const formRef = useRef(null);
  // useTransition marca la navegación como "no urgente":
  // React mantiene la UI anterior visible y expone `isPending` para feedback inmediato.
  const [isPending, startTransition] = useTransition();

  // Sincroniza los inputs del form con la prop `filters` cuando la URL cambia
  // desde fuera (botón LIMPIAR, link "Volver á vista de hoxe", deep links, etc.).
  // Sin esto, los inputs uncontrolled con defaultValue se quedan congelados
  // en el valor del primer render aunque la URL diga otra cosa.
  // Solo escribe si el valor difiere para no mover el cursor del usuario.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const syncInput = (name, expected) => {
      const value = expected ?? '';
      if (form[name] && form[name].value !== value) {
        form[name].value = value;
      }
    };

    syncInput('tecnico', filters.tecnico || 'TODOS');
    syncInput('fechaInicio', filters.fechaInicio);
    syncInput('fechaFin', filters.fechaFin);
    syncInput('tipo', filters.tipo || 'TODOS');
    syncInput('prioridad', filters.prioridad || 'TODAS');
    syncInput('cliente', filters.cliente);
    syncInput('telefono', filters.telefono);
  }, [
    filters.tecnico,
    filters.fechaInicio,
    filters.fechaFin,
    filters.tipo,
    filters.prioridad,
    filters.cliente,
    filters.telefono,
  ]);

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

      // El push se envuelve en startTransition: el indicador `isPending` se
      // activa inmediatamente (sin esperar al round-trip al servidor),
      // dando feedback visual desde el primer click.
      startTransition(() => {
        router.push(`/?${searchParams.toString()}`);
      });
    }, delay);
  }

  function handleClear() {
    if (formRef.current) {
      const today = new Date().toISOString().split('T')[0];
      const form = formRef.current;
      form.tecnico.value = 'TODOS';
      form.fechaInicio.value = today;
      form.fechaFin.value = '';
      form.tipo.value = 'TODOS';
      form.prioridad.value = 'TODAS';
      form.cliente.value = '';
      form.telefono.value = '';
    }
    startTransition(() => {
      router.push('/');
    });
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
    <>
      {/* Barra de progreso fija arriba: aparece INSTANTÁNEO al filtrar.
          Feedback visual antes incluso de que el server responda. */}
      {isPending && (
        <div className="top-progress-bar" role="progressbar" aria-label="Cargando filtros">
          <div className="top-progress-bar-fill" />
          <style jsx>{`
            .top-progress-bar {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              z-index: 9999;
              background: rgba(243, 112, 33, 0.15);
              overflow: hidden;
              pointer-events: none;
            }
            .top-progress-bar-fill {
              position: absolute;
              top: 0;
              left: 0;
              height: 100%;
              width: 40%;
              background: linear-gradient(
                90deg,
                transparent,
                var(--brand-orange) 50%,
                transparent
              );
              animation: top-bar-slide 1.2s ease-in-out infinite;
            }
            @keyframes top-bar-slide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(350%); }
            }
          `}</style>
        </div>
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
        opacity: isPending ? 0.7 : 1,
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
        <label style={{display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.2rem'}}>
          <Calendar size={10} /> DENDE
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="date"
            name="fechaInicio"
            defaultValue={filters.fechaInicio}
            id="fechaInicio"
            onClick={(e) => e.target.showPicker()}
            style={{width: '100%', padding: '0.3rem', paddingRight: '1.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem', cursor: 'pointer', outline: 'none'}}
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
        <label style={{display: 'block', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.2rem'}}>
          <Calendar size={10} /> ATA
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="date"
            name="fechaFin"
            defaultValue={filters.fechaFin}
            id="fechaFin"
            onClick={(e) => e.target.showPicker()}
            style={{width: '100%', padding: '0.3rem', paddingRight: '1.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.75rem', cursor: 'pointer', outline: 'none'}}
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
        <button type="button" onClick={handleClear} style={{ padding: '0.4rem 0.6rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
          <Trash2 size={12} /> LIMPIAR
        </button>
      </div>
    </form>
    </>
  );
}
