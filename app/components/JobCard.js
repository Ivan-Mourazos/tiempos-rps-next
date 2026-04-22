'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Calendar, User, MapPin, Phone, ImageOff, ExternalLink, ChevronRight } from 'lucide-react';
import ExpandableText from './ExpandableText';
import JobModal from './JobModal';
import ImageCarousel from './ImageCarousel';

export default function JobCard({ 
  item, index, timeVal, estTimeVal, solutionVal, 
  tecnicoVal, avisoCompleto, priorityVal, obsVal, 
  timeColor, gpsParts, photos, isRealClientDifferent, formattedDate,
  asistencia, direccionCompleta, telefonoPreaviso,
  zipCode, provincia, localidadCliente
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [showScrollArrow, setShowScrollArrow] = useState(false);

  // Mapeo de colores por tipo (según especificación del usuario)
  const getTypeColor = (tipo) => {
    const t = String(tipo || '').trim().toUpperCase();
    switch (t) {
      case 'PM': return '#6792FF'; // Puesta en marcha
      case 'VT': return '#64FF95'; // Visitas
      case 'IN': return '#E4A2F6'; // Recados
      default: return '#FF7052';   // Avisos / Resto
    }
  };

  const typeColor = getTypeColor(item.tipo);

  useEffect(() => {
    setMounted(true);
    checkScroll();
    
    // Volver a comprobar si la ventana cambia de tamaño
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      // Mostramos la flecha si queda más de 10px por scrollar a la derecha
      setShowScrollArrow(scrollWidth > clientWidth + scrollLeft + 10);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };
  
  const handleOpenLightbox = (e, index) => {
    e.stopPropagation();
    setSelectedImageIndex(index);
    setIsLightboxOpen(true);
  };

  // Ref y estados para el arrastre (drag-to-scroll)
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragged, setDragged] = useState(false); // Para distinguir entre click y drag

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    setDragged(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Velocidad de arrastre
    if (Math.abs(walk) > 2) {
      setDragged(true);
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  // Efecto para limpiar el estado de arrastre globalmente
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  const handlePhotoClick = (e, index) => {
    if (dragged) {
      e.stopPropagation();
      e.preventDefault();
      setDragged(false);
      return;
    }
    handleOpenLightbox(e, index);
  };

  // Link para Google Maps
  const mapsUrl = gpsParts ? `https://www.google.com/maps/search/?api=1&query=${gpsParts[0]},${gpsParts[1]}` : null;

  return (
    <>
      <li className="job-card" style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '0.6rem', 
        padding: '0.6rem', 
        paddingLeft: '1rem', // Aumentado para dar espacio al borde de color
        border: '1px solid var(--border-color)',
        borderLeft: `6px solid ${typeColor}`, // Borde grueso lateral según el tipo
        position: 'relative', 
        overflow: 'hidden',
        background: 'var(--bg-color)',
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

        {/* --- FILA 1: 4 COLUMNAS (GRID) --- */}
        <div className="job-card-main">
          
          {/* COLUMNA 1: Datos (Identificación y Cliente) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderRight: '1px solid var(--border-color)', paddingRight: '0.6rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <strong style={{ 
                   fontSize: '0.9rem', 
                   color: 'white', 
                   background: typeColor, 
                   padding: '2px 8px', 
                   borderRadius: '4px',
                   textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}>{avisoCompleto}</strong>
                <span style={{ 
                   fontSize: '0.65rem', 
                   color: 'var(--brand-orange)', 
                   fontWeight: '800', 
                   background: 'rgba(234,88,12,0.1)', 
                   border: '1px solid rgba(234,88,12,0.35)',
                   padding: '2px 7px', 
                   borderRadius: '4px',
                   textTransform: 'uppercase',
                   letterSpacing: '0.03em'
                }}>{solutionVal}</span>
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
              <div style={{ fontWeight: '600', lineHeight: '1.2' }}>
                <div style={{ marginBottom: '0.1rem' }}>{item.cliente}</div>
                {isRealClientDifferent && (
                  <div style={{ 
                    color: '#4338ca', 
                    fontSize: '0.65rem', 
                    fontWeight: '500',
                    background: 'rgba(67, 56, 202, 0.05)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    display: 'inline-block'
                  }}>
                    {item.local}
                  </div>
                )}
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

          {/* COLUMNA 2: Descrición Técnica */}
          <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '0.6rem' }}>
            <strong style={{ display: 'block', fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Descrición Técnica</strong>
            {item.texto ? (
              <div style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                <ExpandableText text={item.texto} maxLines={6} onExpand={handleOpenModal} />
              </div>
            ) : (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.4, fontStyle: 'italic', height: '100%', display: 'flex', alignItems: 'center' }}>
                Sen descrición técnica
              </div>
            )}
          </div>

          {/* COLUMNA 3: Observacións */}
          <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '0.6rem' }}>
            <strong style={{ display: 'block', fontSize: '0.55rem', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '0.3rem' }}>Observacións</strong>
            {obsVal ? (
              <div style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                <ExpandableText text={obsVal} maxLines={6} onExpand={handleOpenModal} />
              </div>
            ) : (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.4, fontStyle: 'italic', height: '100%', display: 'flex', alignItems: 'center' }}>
                Sen observacións
              </div>
            )}
          </div>

          {/* COLUMNA 4: Tiempo y Ubicación */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', alignItems: 'center' }}>
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
                 {!!item.tiempo_previsto && <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>Est: {estTimeVal}</span>}
              </div>

              {item.localidad && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)', width: '100%', justifyContent: 'center' }}>
                   {mapsUrl ? (
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" title="Ver en Google Maps" style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                        <MapPin size={18} fill="#f87171" />
                      </a>
                   ) : (
                      <MapPin size={18} style={{ color: 'gray' }} />
                   )}
                   <span style={{ fontWeight: '500', textAlign: 'center' }}>{item.localidad}</span>
                </div>
              )}
            </div>

            <button 
              onClick={handleOpenModal}
              style={{
                background: 'var(--surface-color)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.3rem 0.6rem',
                fontSize: '0.65rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                pointerEvents: 'auto',
                width: '100%',
                justifyContent: 'center',
                marginTop: 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--brand-orange)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = 'var(--brand-orange)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface-color)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            >
              Ficha <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* --- FILA 2: Imágenes (Horizontal scroll) --- */}
        {photos.length > 0 && (
          <div style={{ position: 'relative', marginTop: '0.4rem' }}>
            <div 
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              onScroll={checkScroll}
              style={{ 
                display: 'flex', 
                gap: '0.6rem', 
                overflowX: 'auto', 
                paddingBottom: '0.6rem',
                paddingTop: '0.4rem',
                borderTop: '1px dashed var(--border-color)',
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--brand-orange) transparent',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                scrollSnapType: isDragging ? 'none' : 'x proximity',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none'
              }}
              className="custom-scrollbar"
            >
              {photos.map((photo, i) => (
                <div 
                  key={i} 
                  onClick={(e) => handlePhotoClick(e, i)}
                  onDragStart={(e) => e.preventDefault()} // Evita el arrastre nativo de imágenes
                  style={{ 
                    flex: '0 0 160px',
                    height: '110px', 
                    borderRadius: '6px', 
                    overflow: 'hidden', 
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    background: '#1a1a1a', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    position: 'relative',
                    pointerEvents: 'auto',
                    scrollSnapAlign: 'start'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <img 
                    src={photo.url} 
                    alt={`Traballo ${i + 1}`} 
                    loading="lazy"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                  {photos.length > 1 && (
                    <span style={{ 
                      position: 'absolute', bottom: '4px', right: '4px', 
                      background: 'rgba(0,0,0,0.6)', color: 'white', 
                      fontSize: '0.55rem', padding: '2px 5px', borderRadius: '3px' 
                    }}>
                      {i + 1} / {photos.length}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* Indicador de más fotos a la derecha (solo si hay scroll real) */}
            {showScrollArrow && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '0.4rem',
                bottom: '0.6rem',
                width: '40px',
                background: 'linear-gradient(to left, var(--bg-color), transparent)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '4px',
                zIndex: 5,
                transition: 'opacity 0.3s ease'
              }}>
                <ChevronRight size={16} color="var(--brand-orange)" style={{ filter: 'drop-shadow(0 0 2px white)' }} />
              </div>
            )}
          </div>
        )}


        {/* Portales para Modales y Lightbox */}
        {mounted && createPortal(
          <>
            {isModalOpen && (
              <JobModal 
                isOpen={true}
                onClose={() => setIsModalOpen(false)}
                item={item}
                photos={photos}
                gpsParts={gpsParts}
                avisoCompleto={avisoCompleto}
                tecnicoVal={tecnicoVal}
                timeVal={timeVal}
                estTimeVal={estTimeVal}
                timeColor={timeColor}
                typeColor={typeColor}
                solutionVal={solutionVal}
                formattedDate={formattedDate}
                asistencia={asistencia}
                direccionCompleta={direccionCompleta}
                telefonoPreaviso={telefonoPreaviso}
                zipCode={zipCode}
                provincia={provincia}
                localidadCliente={localidadCliente}
              />
            )}
            {isLightboxOpen && (
              <ImageCarousel 
                images={photos} 
                initialIndex={selectedImageIndex} 
                isFullScreenOnly={true} 
                onClose={() => setIsLightboxOpen(false)} 
              />
            )}
          </>,
          document.body
        )}
      </li>
    </>
  );
}
