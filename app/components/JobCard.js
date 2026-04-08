'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Calendar, User, MapPin, Phone, ImageOff } from 'lucide-react';
import ExpandableText from './ExpandableText';
import ImageCarousel from './ImageCarousel';
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

  return (
    <>
      <li className="job-card" style={{ 
        display: 'flex', gap: '1.5rem', padding: '1.2rem', minHeight: '220px',
        border: priorityVal === 1 ? '2px solid var(--brand-orange)' : '1px solid var(--border-color)',
        position: 'relative', overflow: 'hidden', alignItems: 'stretch'
      }}>
        {priorityVal === 1 && <span style={{ position: 'absolute', top: '0', right: '0', zIndex: 10, background: 'var(--brand-orange)', color: 'white', fontSize: '0.55rem', padding: '4px 8px', borderBottomLeftRadius: '6px', fontWeight: '900', letterSpacing: '0.05em' }}>ALTA PRIORIDADE</span>}

        {/* Columna 1: Datos y Cliente */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingRight: '1.5rem', borderRight: '1px dotted var(--border-color)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                 <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem', flexWrap: 'nowrap', overflow: 'hidden' }}>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--brand-orange)', flexShrink: 0 }}>{avisoCompleto}</strong>
                    <span style={{ 
                        fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', 
                        textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', 
                        textOverflow: 'ellipsis', flexShrink: 1, minWidth: 0 
                    }} title={solutionVal}>
                        {solutionVal}
                    </span>
                 </div>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap', overflow: 'hidden' }}>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', minWidth: 0, flexShrink: 1, overflow: 'hidden' }}>
                         <User size={14} style={{ flexShrink: 0 }} /> 
                         <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={tecnicoVal}>{tecnicoVal}</span>
                     </span>
                     <span style={{ color: 'var(--border-color)', flexShrink: 0 }}>|</span>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}><Calendar size={14} style={{ flexShrink: 0 }} /> {formattedDate}</span>
                 </div>
            </div>

            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {item.cliente || 'Descoñecido'}
                    {isRealClientDifferent && (
                        <span style={{ marginLeft: '0.4rem', color: '#4338ca', fontWeight: '800' }}>
                            ({item.local})
                        </span>
                    )}
                </div>
                <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.2rem' }}>
                    {item.localidad && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} /> {item.localidad}</span>}
                    {(item.Telefono1 || item.Telefono2) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={14} /> {item.Telefono1 || ''} {item.Telefono2 ? `/ ${item.Telefono2}` : ''}</span>
                    )}
                </div>
            </div>
            
            <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
               <button 
                  onClick={handleOpenModal}
                  style={{ 
                    background: 'var(--brand-orange)', color: 'white', border: 'none', 
                    padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', 
                    fontWeight: 'bold', cursor: 'pointer', display: 'flex', 
                    alignItems: 'center', gap: '0.3rem', boxShadow: 'var(--shadow-sm)',
                    transition: 'opacity 0.2s'
                  }}
               >
                 Ver Ficha Completa
               </button>
            </div>
        </div>

        {/* Columna 2 Opcional: Solo si hay Textos importantes */}
        {(obsVal || item.texto) && (
            <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', paddingLeft: '0.5rem', height: '100%', overflow: 'hidden' }}>
                <div style={{ 
                    padding: '0.6rem', borderLeft: '3px solid #3b82f6', background: 'rgba(59, 130, 246, 0.05)', 
                    fontSize: '0.82rem', color: 'var(--text-primary)', borderRadius: '0 4px 4px 0', 
                    display: 'flex', flexDirection: 'column', flex: 1, gap: '0.6rem', overflow: 'hidden' 
                }}>
                    
                    {/* Descrición Técnica (Arriba, flexible) */}
                    {item.texto && (
                        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: '2.8rem', overflow: 'hidden' }}>
                            <strong style={{ display: 'block', fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Descrición Técnica</strong>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <ExpandableText text={item.texto} maxLines={10} onExpand={handleOpenModal} />
                            </div>
                        </div>
                    )}

                    {/* Observacións (Abajo, se ajusta al contenido pero deja al menos 2 líneas arriba si es largo) */}
                    {obsVal && (
                        <div style={{ flex: '0 1 auto', display: 'flex', flexDirection: 'column', maxHeight: item.texto ? 'calc(100% - 3.2rem)' : '100%', overflow: 'hidden' }}>
                            <strong style={{ display: 'block', fontSize: '0.62rem', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '0.2rem' }}>Observacións IMPORTANTES</strong>
                            <div style={{ overflow: 'hidden' }}>
                                <ExpandableText text={obsVal} maxLines={10} onExpand={handleOpenModal} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Columna Derecha: Tiempos y Medios Reorganizados */}
        <div style={{ width: '440px', display: 'flex', flexShrink: 0, borderLeft: '1px dotted var(--border-color)', paddingLeft: '1.5rem', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', gap: '0.8rem', flex: 1, alignItems: 'stretch' }}>
                
                {/* Fotos (A la izquierda del grupo, maximizadas) */}
                {photos.length > 0 ? (
                    <div style={{ flex: 1, position: 'relative', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ position: 'absolute', inset: 0 }}>
                            <ImageCarousel images={photos} />
                        </div>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-sm)', opacity: 0.5 }}>
                        <ImageOff size={24} />
                    </div>
                )}

                {/* Grupo Vertical: Tiempo (arriba) + Mapa (abajo) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                    
                    {/* Tiempo (Sin tarjeta, solo texto) */}
                    <div style={{ width: 'fit-content', padding: '0.2rem 0' }}>
                         <div style={{ fontSize: '0.9rem', fontWeight: '900', color: timeColor, display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                            <Clock size={15} /> {timeVal} {item.tiempo_previsto ? <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Est: {estTimeVal})</span> : ''}
                         </div>
                    </div>

                    {/* Mapa (Alineado por la IZQUIERDA con el tiempo) */}
                    {gpsParts ? (
                        <div style={{ width: '160px', height: '160px', position: 'relative', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
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
                    ) : (
                        <div style={{ width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-sm)', opacity: 0.5 }}>
                            <MapPin size={24} />
                        </div>
                    )}
                </div>

            </div>
        </div>
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
