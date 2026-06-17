'use client';

import { useEffect, useState } from 'react';
import { X, Clock, MapPin, Phone, Calendar, User, FileText } from 'lucide-react';
import ImageCarousel from './ImageCarousel';
import PdfModal from './PdfModal';

export default function JobModal({ 
  isOpen, onClose, item, photos, gpsParts, avisoCompleto, tecnicoVal, 
  timeVal, estTimeVal, timeColor, typeColor, solutionVal, formattedDate,
  asistencia, direccionCompleta, telefonoPreaviso,
  zipCode, provincia, localidadCliente
}) {
  const [mounted, setMounted] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Texto contrastante (WCAG) sobre el color de tipo, igual que en JobCard.
  const getContrastText = (hex) => {
    const c = String(hex).replace('#', '');
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return (L + 0.05) / 0.05 >= 1.05 / (L + 0.05) ? '#1a1a1a' : '#ffffff';
  };
  const badgeTextColor = getContrastText(typeColor);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted) return null;

  const hasMedia = photos.length > 0 || !!gpsParts;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: isOpen ? 'flex' : 'none',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel centrado */}
      <div style={{
        position: 'relative',
        width: 'min(88vw, 1100px)',
        height: 'min(88vh, 820px)',
        background: 'var(--surface-color)',
        borderRadius: '12px',
        borderTop: `4px solid ${typeColor}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* CABECEIRA */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', minWidth: 0 }}>
            <strong style={{
              fontSize: '1.1rem', color: badgeTextColor, background: typeColor,
              padding: '2px 10px', borderRadius: '6px', whiteSpace: 'nowrap',
              textShadow: badgeTextColor === '#ffffff' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
            }}>{avisoCompleto}</strong>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              <User size={13} /> {tecnicoVal}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>·</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <Calendar size={13} /> {formattedDate}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1rem', fontWeight: '900', color: timeColor }}>
              <Clock size={14} /> {timeVal}
              {!!item.tiempo_previsto && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Est: {estTimeVal})</span>}
            </span>
            <span style={{
              fontSize: '0.7rem', fontWeight: '800',
              color: 'var(--solution-fg)', background: 'var(--solution-bg)',
              border: '1px solid var(--solution-border)',
              padding: '2px 7px', borderRadius: '4px',
              textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap',
            }}>{solutionVal}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            {item.pedido && (
              <button
                onClick={() => setIsPdfModalOpen(true)}
                style={{
                  background: 'var(--brand-orange)', color: 'rgba(0,0,0,0.85)',
                  border: '1px solid var(--brand-orange)', borderRadius: '6px',
                  padding: '0.35rem 0.9rem', fontSize: '0.75rem', fontWeight: '700',
                  display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <FileText size={14} /> PEDIDO
              </button>
            )}
            <button
              onClick={onClose}
              className="theme-toggle-btn"
              aria-label="Cerrar"
              style={{ padding: '0.4rem' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CORPO: dúas columnas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: hasMedia ? '1fr 1fr' : '1fr',
          flex: 1,
          overflow: 'hidden',
        }}>

          {/* COLUMNA ESQUERDA — info (scrollable) */}
          <div style={{
            overflowY: 'auto', padding: '1.25rem',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
            borderRight: hasMedia ? '1px solid var(--border-color)' : 'none',
          }}>

            {/* Cliente */}
            <div>
              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '0.3rem', letterSpacing: '0.04em' }}>Cliente / Local</p>
              <p style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.1rem' }}>
                {item.cliente || 'Descoñecido'}{item.local ? <> <span className="job-card-local-name-modal">({item.local})</span></> : ''}
              </p>
              {(item.Telefono1 || item.Telefono2) && (
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  <Phone size={13} /> {item.Telefono1 || ''}{item.Telefono2 ? ` / ${item.Telefono2}` : ''}
                </p>
              )}
              {direccionCompleta && (
                <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.8rem', background: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{direccionCompleta}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    {zipCode && <span>{zipCode} </span>}{localidadCliente || item.localidad}{provincia && <span> ({provincia})</span>}
                  </p>
                </div>
              )}
              {!direccionCompleta && item.localidad && (
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  <MapPin size={13} /> {item.localidad}
                </p>
              )}
            </div>

            {/* Observacións */}
            {item.observaciones && (
              <div style={{ padding: '0.75rem 1rem', borderLeft: '3px solid var(--accent-obs)', background: 'rgba(59,130,246,0.08)', borderRadius: '0 6px 6px 0' }}>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent-obs)', fontWeight: '700', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>Observacións importantes</p>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{item.observaciones}</div>
              </div>
            )}

            {/* Descrición técnica */}
            {item.texto && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-elevated)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>Descrición Técnica</p>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{item.texto}</div>
              </div>
            )}
          </div>

          {/* COLUMNA DEREITA — fotos + mapa (só se hai media) */}
          {hasMedia && (
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
              {photos.length > 0 && (
                <div style={{ flex: 1, minHeight: 0, borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden', background: 'var(--bg-color)' }}>
                  <ImageCarousel images={photos} />
                </div>
              )}
              {gpsParts && (
                <div style={{ flex: 1, minHeight: 0, borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <iframe
                    width="100%" height="100%"
                    style={{ border: 0, display: 'block' }}
                    loading="lazy" allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${gpsParts[0]},${gpsParts[1]}&hl=es&z=17&t=h&output=embed`}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isPdfModalOpen && (
        <PdfModal
          isOpen={true}
          onClose={() => setIsPdfModalOpen(false)}
          pdfUrl={item.pedido}
          title={item.aviso}
        />
      )}
    </div>
  );
}
