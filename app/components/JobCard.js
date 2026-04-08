'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Calendar, User, MapPin, Phone, ImageOff, ExternalLink } from 'lucide-react';
import ExpandableText from './ExpandableText';
import JobModal from './JobModal';

export default function JobCard({ 
  item, index, timeVal, estTimeVal, solutionVal, 
  tecnicoVal, avisoCompleto, priorityVal, obsVal, 
  timeColor, gpsParts, photos, isRealClientDifferent, formattedDate 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpenModal = () => setIsModalOpen(true);

  // Link para Google Maps
  const mapsUrl = gpsParts ? `https://www.google.com/maps/search/?api=1&query=${gpsParts[0]},${gpsParts[1]}` : null;

  return (
    <>
      <li className="job-card" style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '0.6rem', 
        padding: '0.6rem', 
        border: priorityVal === 1 ? '2px solid var(--brand-orange)' : '1px solid var(--border-color)',
        position: 'relative', 
        overflow: 'hidden'
      }}>
        {priorityVal === 1 && (
          <span style={{ 
            position: 'absolute', top: '0', left: '0', zIndex: 10, 
            background: 'var(--brand-orange)', color: 'white', fontSize: '0.45rem', 
            padding: '2px 6px', borderBottomRightRadius: '4px', fontWeight: '900' 
          }}>
            PRIORIDADE
          </span>
        )}

        {/* --- FILA 1: 3 COLUMNAS --- */}
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
          
          {/* COLUMNA 1: Datos (Identificación y Cliente) */}
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderRight: '1px solid var(--border-color)', paddingRight: '0.6rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--brand-orange)' }}>{avisoCompleto}</strong>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 'bold', background: 'rgba(0,0,0,0.04)', padding: '2px 4px', borderRadius: '4px' }}>{solutionVal}</span>
              </div>
              <div style={{ fontSize: '0.7rem', display: 'flex', gap: '0.4rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                  <User size={10} /> {tecnicoVal}
                </span>
                <span>|</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Calendar size={10} /> {formattedDate}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ fontWeight: '600' }}>
                {item.cliente}
                {isRealClientDifferent && <span style={{ color: '#4338ca', fontSize: '0.7rem', marginLeft: '0.4rem' }}>({item.local})</span>}
              </div>
              <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                {item.Telefono1 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Phone size={10} /> {item.Telefono1} {item.Telefono2 ? `/ ${item.Telefono2}` : ''}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* COLUMNA 2: Textos (Descripción y Observaciones) */}
          <div style={{ flex: '2 1 300px', display: 'flex', gap: '0.6rem', borderRight: '1px solid var(--border-color)', paddingRight: '0.6rem' }}>
            {(item.texto || obsVal) ? (
               <>
                {item.texto && (
                  <div style={{ flex: '1 1 50%', background: 'rgba(0,0,0,0.02)', padding: '0.4rem', borderRadius: '4px', borderLeft: '2px solid var(--border-color)', fontSize: '0.75rem' }}>
                    <strong style={{ display: 'block', fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Descrición Técnica</strong>
                    <div style={{ lineHeight: '1.2' }}>
                       <ExpandableText text={item.texto} maxLines={6} onExpand={handleOpenModal} />
                    </div>
                  </div>
                )}
                {obsVal && (
                  <div style={{ flex: '1 1 50%', background: 'rgba(59, 130, 246, 0.05)', padding: '0.4rem', borderRadius: '4px', borderLeft: '2px solid #3b82f6', fontSize: '0.75rem' }}>
                    <strong style={{ display: 'block', fontSize: '0.55rem', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '0.15rem' }}>Observacións</strong>
                    <div style={{ lineHeight: '1.2' }}>
                       <ExpandableText text={obsVal} maxLines={6} onExpand={handleOpenModal} />
                    </div>
                  </div>
                )}
               </>
            ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.5, fontSize: '0.7rem' }}>
                  Sen descrición técnica
                </div>
            )}
          </div>

          {/* COLUMNA 3: Tiempo y Chincheta */}
          <div style={{ flex: '0 0 auto', minWidth: '100px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', gap: '0.6rem' }}>
            
            {/* Tiempo */}
            <div style={{ 
              fontSize: '0.85rem', fontWeight: '900', color: timeColor, 
              display: 'flex', flexDirection: 'column', gap: '0.1rem', 
              background: 'var(--bg-color)', padding: '0.3rem 0.5rem', 
              borderRadius: '4px', border: '1px solid var(--border-color)',
              width: '100%', alignItems: 'center'
            }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                 <Clock size={12} /> {timeVal}
               </div>
               {item.tiempo_previsto && <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>Est: {estTimeVal}</span>}
            </div>

            {/* Chincheta y Localidad */}
            {item.localidad && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)', width: '100%', justifyContent: 'center' }}>
                 {mapsUrl ? (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" title="Ver en Google Maps" style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                      <MapPin size={18} fill="#f87171" />
                    </a>
                 ) : (
                    <MapPin size={18} style={{ color: 'gray' }} />
                 )}
                 <span style={{ fontWeight: '500' }}>{item.localidad}</span>
              </div>
            )}

          </div>

        </div>

        {/* --- FILA 2: Imágenes (De izquierda a derecha) --- */}
        {photos.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
            {photos.slice(0, 5).map((photo, i) => (
              <div 
                key={i} 
                onClick={handleOpenModal}
                style={{ 
                  width: '200px', 
                  height: '150px', 
                  borderRadius: '4px', 
                  overflow: 'hidden', 
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  background: '#1a1a1a', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img 
                  src={photo.url} 
                  alt="Traballo" 
                  loading="lazy"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
            ))}
          </div>
        )}

        {mounted && createPortal(
            <JobModal 
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              item={item}
              photos={photos}
              gpsParts={gpsParts}
              avisoCompleto={avisoCompleto}
              tecnicoVal={tecnicoVal}
              timeVal={timeVal}
              estTimeVal={estTimeVal}
              timeColor={timeColor}
              solutionVal={solutionVal}
              formattedDate={formattedDate}
            />,
            document.body
        )}
      </li>
    </>
  );
}
