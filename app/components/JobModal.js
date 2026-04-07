'use client';

import { useEffect, useState } from 'react';
import { X, Clock, MapPin, Phone, Calendar, User } from 'lucide-react';
import ImageCarousel from './ImageCarousel';

export default function JobModal({ isOpen, onClose, item, photos, gpsParts, avisoCompleto, tecnicoVal, timeVal, estTimeVal, timeColor, solutionVal, formattedDate }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted) return null;
  
  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
        visibility: isOpen ? 'visible' : 'hidden',
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'visibility 0.3s ease'
      }}
    >
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(3px)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
      />
      
      <div 
        style={{
          position: 'relative',
          width: '50vw',
          minWidth: '400px',
          maxWidth: '600px',
          height: '100%',
          background: 'var(--bg-color)',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
             <strong style={{ fontSize: '1.3rem', color: 'var(--brand-orange)' }}>{avisoCompleto}</strong>
             <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><User size={16} /> {tecnicoVal}</span>
                 <span style={{ color: 'var(--border-color)', margin: '0 0.2rem' }}>|</span>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-secondary)' }}><Calendar size={16} /> {formattedDate}</span>
             </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} aria-label="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--surface-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                 <div style={{ fontSize: '1.1rem', fontWeight: '900', color: timeColor, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={20} /> {timeVal} {item.tiempo_previsto ? <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Est: {estTimeVal})</span> : ''}
                 </div>
                 <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Solución: {solutionVal}
                 </div>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.95rem' }}>
              <div>
                  <strong style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Cliente / Local</strong>
                  {item.cliente || 'Descoñecido'} {item.local ? <span style={{ color: '#4338ca', fontWeight: '600' }}>({item.local})</span> : ''}
              </div>
              <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {item.localidad && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={16} /> {item.localidad}</span>}
                  {(item.Telefono1 || item.Telefono2) && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Phone size={16} /> {item.Telefono1 || ''} {item.Telefono2 ? `/ ${item.Telefono2}` : ''}</span>
                  )}
              </div>
           </div>

           {item.observaciones && (
               <div style={{ padding: '1rem', borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.05)', fontSize: '0.95rem', color: 'var(--text-primary)', borderRadius: '0 4px 4px 0' }}>
                 <strong style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '0.6rem' }}>Observacións IMPORTANTES</strong>
                 <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{item.observaciones}</div>
               </div>
           )}

           {item.texto && (
               <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                 <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.6rem', display: 'block' }}>Descrición Técnica</strong>
                 <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{item.texto}</div>
               </div>
           )}

           { (photos.length > 0 || gpsParts) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                 {photos.length > 0 && (
                     <div style={{ width: '100%', height: '300px', position: 'relative', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                         <div style={{ position: 'absolute', inset: 0 }}>
                           <ImageCarousel images={photos} />
                         </div>
                     </div>
                 )}
                 {gpsParts && (
                     <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                         <div style={{ position: 'absolute', inset: 0 }}>
                             <iframe
                                 width="100%"
                                 height="100%"
                                 style={{ border: 0 }}
                                 loading="lazy"
                                 allowFullScreen
                                 referrerPolicy="no-referrer-when-downgrade"
                                 src={`https://maps.google.com/maps?q=${gpsParts[0]},${gpsParts[1]}&hl=es&z=15&output=embed`}
                             ></iframe>
                         </div>
                     </div>
                 )}
              </div>
           )}

           <div style={{ paddingBottom: '3rem' }}></div>
        </div>
      </div>
    </div>
  );
}
