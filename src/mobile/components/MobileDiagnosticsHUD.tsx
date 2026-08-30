import React, { useEffect, useState } from 'react';

export function MobileDiagnosticsHUD() {
  const [metrics, setMetrics] = useState({
    innerHeight: 0,
    visualViewportHeight: 0,
    bodyClientHeight: 0,
    rootClientHeight: 0,
    safeAreaBottom: '',
    navBottom: 0,
    audioReadyState: 0,
    audioNetworkState: 0,
    audioPaused: true,
    audioSrc: '',
    audioCurrentTime: 0,
    audioError: '',
  });

  useEffect(() => {
    const updateMetrics = () => {
      const root = document.getElementById('root');
      const nav = document.getElementById('mobile-bottom-nav');
      const audio = document.querySelector('audio');
      
      const computedStyles = getComputedStyle(document.documentElement);
      // Fallback manual since env() cannot be directly read via getPropertyValue easily without a proxy variable
      
      setMetrics({
        innerHeight: window.innerHeight,
        visualViewportHeight: window.visualViewport?.height || 0,
        bodyClientHeight: document.body.clientHeight,
        rootClientHeight: root?.clientHeight || 0,
        safeAreaBottom: 'N/A directly',
        navBottom: nav?.getBoundingClientRect().bottom || 0,
        audioReadyState: audio?.readyState || 0,
        audioNetworkState: audio?.networkState || 0,
        audioPaused: audio?.paused ?? true,
        audioSrc: audio?.src ? audio.src.substring(0, 40) + '...' : 'none',
        audioCurrentTime: audio?.currentTime || 0,
        audioError: audio?.error ? "Code: " + audio.error.code + " | Msg: " + audio.error.message : 'None',
      });
    };

    const interval = setInterval(updateMetrics, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-24 left-4 right-4 z-[9999] bg-black/90 border-2 border-red-500 rounded p-3 text-[10px] font-mono text-green-400 pointer-events-none shadow-[0_0_15px_red]">
      <h3 className="font-bold text-red-500 mb-1">DIAGNÓSTICO TÉCNICO</h3>
      <div>window.innerHeight: {metrics.innerHeight}px</div>
      <div>visualViewport.height: {metrics.visualViewportHeight}px</div>
      <div>body.clientHeight: {metrics.bodyClientHeight}px</div>
      <div>#root.clientHeight: {metrics.rootClientHeight}px</div>
      <div>nav.bottom: {metrics.navBottom}px</div>
      <hr className="border-green-800 my-1"/>
      <div className="text-yellow-300">&lt;audio&gt; STATUS:</div>
      <div>src: {metrics.audioSrc}</div>
      <div>readyState: {metrics.audioReadyState}</div>
      <div>networkState: {metrics.audioNetworkState}</div>
      <div>paused: {String(metrics.audioPaused)}</div>
      <div>currentTime: {metrics.audioCurrentTime.toFixed(1)}s</div>
      <div className="text-red-400">error: {metrics.audioError}</div>
    </div>
  );
}
