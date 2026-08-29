import { useState, useEffect } from 'react';
import { type } from '@tauri-apps/plugin-os';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

let globalForceMobile = false;
const listeners = new Set<(val: boolean) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      globalForceMobile = !globalForceMobile;
      listeners.forEach(l => l(globalForceMobile));
      
      try {
        const win = getCurrentWindow();
        if (globalForceMobile) {
          await win.setSize(new LogicalSize(393, 852));
        } else {
          await win.setSize(new LogicalSize(1200, 800));
        }
      } catch (err) {
        console.warn('Tauri window resize failed', err);
      }
    }
  });
}

function checkIsMobile() {
  let isOsMobile = false;
  try {
    const t = type();
    isOsMobile = t === 'ios' || t === 'android';
  } catch (e) {
    // plugin-os might fail in some environments
  }
  
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const isSmallScreen = window.innerWidth <= 1024;
  
  return isOsMobile || isTouch || isSmallScreen;
}

export function useMobile() {
  const [forceMobile, setForceMobile] = useState(globalForceMobile);
  const [isMobile, setIsMobile] = useState(checkIsMobile);

  useEffect(() => {
    const l = (val: boolean) => setForceMobile(val);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(checkIsMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return forceMobile || isMobile;
}
