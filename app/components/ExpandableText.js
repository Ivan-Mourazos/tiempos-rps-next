'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';

// Fallback for SSR/Next.js
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function ExpandableText({ text, maxLines = 1, onExpand }) {
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef(null);

  useIsomorphicLayoutEffect(() => {
    if (!textRef.current) return;
    
    const checkTruncation = () => {
      if (textRef.current) {
        setIsTruncated(textRef.current.scrollHeight > textRef.current.clientHeight);
      }
    };

    // Initial check
    checkTruncation();

    // Resize observer to catch changes if window resizes
    const observer = new ResizeObserver(checkTruncation);
    observer.observe(textRef.current);

    return () => observer.disconnect();
  }, [text, maxLines]);

  if (!text) return <span style={{ opacity: 0.5 }}>Sen descrición.</span>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', position: 'relative' }}>
      <div 
        ref={textRef}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: '1.4'
        }}
      >
        {text}
      </div>
      {isTruncated && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (onExpand) onExpand();
          }}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            color: 'var(--brand-orange)',
            fontWeight: '800',
            cursor: 'pointer',
            padding: '2px 0 0 0',
            fontSize: '0.7rem',
            textTransform: 'uppercase'
          }}
        >
          VER MÁIS
        </button>
      )}
    </div>
  );
}
