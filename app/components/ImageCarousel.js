'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, Download } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function ImageCarousel({ images }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    <div style={{
      position: 'relative',
      width: '100%',
      height: fullscreen ? '100vh' : '100%',
      backgroundColor: fullscreen ? 'rgba(0,0,0,0.95)' : '#eee',
      borderRadius: fullscreen ? '0' : '8px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: fullscreen ? 99999 : 1
    }}>
      <img
        src={imageUrl}
        alt={`Imagen ${currentIndex + 1}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: fullscreen ? 'contain' : 'cover',
          transition: 'opacity 0.3s'
        }}
      />
      
      {images.length > 1 && (
        <>
          <button onClick={prevImage} style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10
          }}>
            <ChevronLeft />
          </button>
          <button onClick={nextImage} style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10
          }}>
            <ChevronRight />
          </button>
          <div style={{
            position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: '5px', background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '12px', zIndex: 10
          }}>
            {images.map((_, i) => (
              <div key={i} style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: i === currentIndex ? 'white' : 'rgba(255,255,255,0.4)',
                transition: 'background 0.2s'
              }} />
            ))}
          </div>
        </>
      )}

      {/* Botón de Descarga (Arriba Izquierda para no saturar) */}
      <a 
        href={imageUrl} 
        download={imageName}
        onClick={(e) => e.stopPropagation()}
        title="Descargar imaxe orixinal"
        style={{
          position: 'absolute',
          top: fullscreen ? '20px' : '10px',
          left: fullscreen ? '20px' : '10px',
          background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '4px', 
          width: fullscreen ? '44px' : '32px', height: fullscreen ? '44px' : '32px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          cursor: 'pointer', textDecoration: 'none', zIndex: 30
        }}
      >
        <Download size={fullscreen ? 20 : 16} />
      </a>

      {/* Botón Cerrar / Maximizar (Arriba Derecha) */}
      <div style={{ position: 'absolute', top: fullscreen ? '20px' : '10px', right: fullscreen ? '20px' : '10px', zIndex: 30 }}>
        {fullscreen ? (
          <button onClick={() => setIsFullscreen(false)} style={{
            background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <X />
          </button>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }} style={{
            background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '4px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <Maximize2 size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {carouselContent(false)}
      {isFullscreen && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999 }}>
          {carouselContent(true)}
        </div>,
        document.body
      )}
    </>
  );
}
