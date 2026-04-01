'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn } from 'lucide-react';

export default function ExpandableImage({ src, alt }) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const modalContent = isOpen && (
        <div 
            className="modal-overlay"
            onClick={() => setIsOpen(false)}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(10px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                animation: 'fadeIn 0.2s ease-out'
            }}
        >
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    zIndex: 100000
                }}
            >
                <X size={28} />
            </button>

            <img 
                src={src} 
                alt={alt}
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: '100%',
                    maxHeight: '95vh',
                    objectFit: 'contain',
                    borderRadius: '4px',
                    boxShadow: '0 0 50px rgba(0,0,0,0.8)',
                    animation: 'zoomInModal 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            />
        </div>
    );

    return (
        <>
            <div 
                className="expandable-image-container"
                onClick={() => setIsOpen(true)}
                style={{ 
                    position: 'relative', 
                    cursor: 'zoom-in',
                    width: '70px',
                    height: '70px',
                    overflow: 'hidden',
                    borderRadius: '4px'
                }}
            >
                <img 
                    src={src} 
                    alt={alt}
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover', 
                        border: '1px solid var(--border-color)', 
                        background: '#eee' 
                    }}
                />
                <div className="hover-overlay" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s'
                }}>
                    <ZoomIn size={18} color="white" />
                </div>
            </div>

            {mounted && isOpen && createPortal(modalContent, document.body)}

            <style jsx>{`
                .expandable-image-container:hover .hover-overlay {
                    opacity: 1 !important;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes zoomInModal {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </>
    );
}
