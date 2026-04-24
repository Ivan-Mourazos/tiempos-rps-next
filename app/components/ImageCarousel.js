'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, Download } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function ImageCarousel({ images, initialIndex = 0, isFullScreenOnly = false, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(isFullScreenOnly);
  
  // Estados para Zoom y Pan
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Sync internal state with props if they change externally
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    setIsFullscreen(isFullScreenOnly);
  }, [isFullScreenOnly]);

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setIsFullscreen(false);
    if (onClose) onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
      if (scale === 1) { // Solo permitir cambiar imagen si no hay zoom
        if (e.key === 'ArrowLeft') setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        if (e.key === 'ArrowRight') setCurrentIndex((prev) => (prev + 1) % images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, images.length, scale]);

  // Reset zoom when image changes or closing
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex, isFullscreen]);

  // Bloquear scroll del body cuando está en pantalla completa
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const handleWheel = (e) => {
    if (!isFullscreen) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    const newScale = Math.max(1, Math.min(5, scale + delta));
    setScale(newScale);
    if (newScale === 1) setPosition({ x: 0, y: 0 });
  };

  const startPanning = (e) => {
    if (!isFullscreen || scale <= 1) return;
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handlePanning = (e) => {
    if (!isPanning) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    // Ajustamos la velocidad de movimiento según el zoom
    setPosition(prev => ({ 
      x: prev.x + dx / scale, 
      y: prev.y + dy / scale 
    }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const stopPanning = () => {
    setIsPanning(false);
  };

  if (!images || images.length === 0) return null;

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const currentImage = images[currentIndex];
  const imageUrl = typeof currentImage === 'object' ? currentImage.url : currentImage;
  const imageName = typeof currentImage === 'object' ? currentImage.originalName : `imagen_${currentIndex + 1}.jpg`;

  const carouselContent = (fullscreen) => (
    <div 
      onClick={() => !fullscreen && setIsFullscreen(true)}
      style={{
        position: 'relative',
        width: '100%',
        height: fullscreen ? '100vh' : '100%',
        backgroundColor: fullscreen ? 'rgba(0,0,0,0.95)' : '#eee',
        borderRadius: fullscreen ? '0' : '8px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: fullscreen ? 99999 : 1,
        cursor: fullscreen ? 'default' : 'zoom-in',
        userSelect: 'none'
      }}
    >
      {/* Background overlay for clicking to close in fullscreen */}
      {fullscreen && (
        <div 
          onClick={handleClose} 
          style={{ position: 'absolute', inset: 0, zIndex: 5 }} 
        />
      )}

      <img
        src={imageUrl}
        alt={`Imagen ${currentIndex + 1}`}
        onWheel={handleWheel}
        onMouseDown={startPanning}
        onMouseMove={handlePanning}
        onMouseUp={stopPanning}
        onMouseLeave={stopPanning}
        draggable={false}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: fullscreen ? 'auto' : '100%',
          height: fullscreen ? 'auto' : '100%',
          objectFit: fullscreen ? 'contain' : 'cover',
          transition: isPanning ? 'none' : 'opacity 0.3s, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 10,
          boxShadow: fullscreen ? '0 10px 50px rgba(0,0,0,0.5)' : 'none',
          transform: fullscreen ? `scale(${scale}) translate(${position.x}px, ${position.y}px)` : 'none',
          cursor: fullscreen ? (scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default') : 'zoom-in',
          touchAction: 'none'
        }}
      />
      
      {/* Controls */}
      {images.length > 1 && (
        <>
          <button onClick={prevImage} style={{
            position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', 
            width: fullscreen ? '56px' : '40px', height: fullscreen ? '56px' : '40px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20,
            transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.8)'} onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.5)'}>
            <ChevronLeft size={fullscreen ? 32 : 24} />
          </button>
          <button onClick={nextImage} style={{
            position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', 
            width: fullscreen ? '56px' : '40px', height: fullscreen ? '56px' : '40px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20,
            transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.8)'} onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.5)'}>
            <ChevronRight size={fullscreen ? 32 : 24} />
          </button>
          <div style={{
            position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: '16px', zIndex: 20
          }}>
            {images.length > 7 ? (
              <div style={{
                color: 'white', fontSize: '0.8rem', fontWeight: '600',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
              }}>
                {currentIndex + 1} / {images.length}
              </div>
            ) : (
              images.map((_, i) => (
                <div key={i} onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }} style={{
                  width: '10px', height: '10px', borderRadius: '50%', cursor: 'pointer',
                  background: i === currentIndex ? 'white' : 'rgba(255,255,255,0.4)',
                  transform: i === currentIndex ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.2s'
                }} />
              ))
            )}
          </div>
        </>
      )}

      {/* Fullscreen Title Bar */}
      {fullscreen && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 30px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
          color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          zIndex: 30
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '1rem', fontWeight: '600', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {imageName}
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
              Imaxe {currentIndex + 1} de {images.length}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '15px' }}>
            <a 
              href={imageUrl} 
              download={imageName}
              onClick={(e) => e.stopPropagation()}
              title="Descargar imaxe orixinal"
              style={{
                background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', 
                borderRadius: '8px', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s', fontSize: '0.9rem'
              }}
              onMouseEnter={(e) => { e.target.style.background = 'white'; e.target.style.color = 'black'; }}
              onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = 'white'; }}
            >
              <Download size={18} /> Descargar
            </a>
            
            <button 
              onClick={handleClose} 
              style={{
                background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', 
                borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.target.style.background = '#ef4444'; e.target.style.borderColor = '#ef4444'; }}
              onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Mini Name (only when not fullscreen) */}
      {!fullscreen && (
        <div style={{ 
          position: 'absolute', top: 0, left: 0, right: 0, 
          padding: '8px 12px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
          zIndex: 30,
          pointerEvents: 'none'
        }}>
          <span style={{ 
            fontSize: '0.65rem', 
            fontWeight: '600', 
            color: 'white',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            display: 'block',
            maxWidth: '85%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {imageName}
          </span>
        </div>
      )}

      {/* Mini Maximizar Icon (only when not fullscreen) */}
      {!fullscreen && (
        <div style={{ position: 'absolute', top: '8px', right: '10px', zIndex: 30 }}>
          <div style={{
            background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '4px', 
            width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            opacity: 0.8
          }}>
            <Maximize2 size={14} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {!isFullScreenOnly && carouselContent(false)}
      {isFullscreen && createPortal(
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          zIndex: 99999, animation: 'fadeIn 0.2s ease-out' 
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}} />
          {carouselContent(true)}
        </div>,
        document.body
      )}
    </>
  );
}
