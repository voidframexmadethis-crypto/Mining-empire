'use client';

import React, { useEffect, useState } from 'react';
import { soundManager } from '../lib/audio';

export default function AudioDiagnostics() {
  const [status, setStatus] = useState<string>('Initializing...');
  const [ctxState, setCtxState] = useState<string>('Unknown');
  const [buffers, setBuffers] = useState<{ music: boolean; wind: boolean; drip: boolean }>({
    music: false,
    wind: false,
    drip: false,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      // Access private fields using type assertion, purely for debugging purposes.
      // This is safe here because we are not modifying them.
      const sm = soundManager as any;
      const ctx = sm.ctx;
      
      setCtxState(ctx ? ctx.state : 'No Context');
      
      setBuffers({
        music: !!sm.countryMusicBuffer,
        wind: !!sm.caveWindBuffer,
        drip: !!sm.waterDripBuffer,
      });

      setStatus(ctx && ctx.state === 'running' ? 'Running' : 'Suspended/Not Init');
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg z-[100] text-xs font-mono">
      <h3 className="font-bold mb-2">Audio Diagnostics</h3>
      <p>Context: {ctxState}</p>
      <p>Status: {status}</p>
      <ul className="mt-2">
        <li>Music Buffer: {buffers.music ? '✅' : '❌'}</li>
        <li>Wind Buffer: {buffers.wind ? '✅' : '❌'}</li>
        <li>Drip Buffer: {buffers.drip ? '✅' : '❌'}</li>
      </ul>
      <button 
        onClick={() => soundManager.ensureAudioContext()}
        className="mt-2 bg-blue-600 px-2 py-1 rounded"
      >
        Force Resume
      </button>
    </div>
  );
}
