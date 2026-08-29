import React, { useRef, useEffect, useState } from "react";
import { useMobile } from '../hooks/useMobile';

// Shared global ResizeObserver for performance
const observerMap = new Map<Element, () => void>();
const globalObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((entries) => {
  for (const entry of entries) {
    const callback = observerMap.get(entry.target);
    if (callback) callback();
  }
}) : null;

export const AutoScrollText = ({ 
  text, 
  className = "", 
  children,
  speed = 0.25
}: { 
  text?: string, 
  className?: string, 
  children?: React.ReactNode,
  speed?: number 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const isMobile = useMobile();

  const checkOverflow = () => {
    if (containerRef.current && textRef.current) {
      const firstBlock = textRef.current.firstElementChild as HTMLElement;
      if (firstBlock) {
         setIsOverflowing(firstBlock.scrollWidth > containerRef.current.clientWidth);
      } else {
         setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    }
  };

  useEffect(() => {
    checkOverflow();
    if (!containerRef.current || !globalObserver) return;
    
    observerMap.set(containerRef.current, checkOverflow);
    globalObserver.observe(containerRef.current);
    
    return () => {
      if (containerRef.current) {
        observerMap.delete(containerRef.current);
        globalObserver.unobserve(containerRef.current);
      }
    };
  }, [text, children]);

  const content = children || <span>{text}</span>;
  const contentLen = text ? text.length : 20;

  return (
    <div 
      ref={containerRef} 
      className={`w-full overflow-hidden flex items-center relative mask-edges-auto ${className}`}
      onMouseEnter={!isMobile ? checkOverflow : undefined}
    >
      <div 
        ref={textRef} 
        className={`whitespace-nowrap flex items-center ${isOverflowing ? 'animate-marquee-auto' : ''}`}
        style={{
          animationDuration: isOverflowing ? `${Math.max(8, contentLen * speed)}s` : '0s'
        }}
      >
        <div className="inline-flex items-center shrink-0">
          {content}
        </div>
        
        {isOverflowing && (
          <div className="inline-flex items-center shrink-0 ml-12">
            {content}
          </div>
        )}
      </div>
      <style>{`
        @keyframes marquee-auto {
          0% { transform: translateX(0); }
          15% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 1.5rem)); }
        }
        .animate-marquee-auto {
          animation: marquee-auto linear infinite;
        }
        .mask-edges-auto {
          mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
        }
      `}</style>
    </div>
  );
};
