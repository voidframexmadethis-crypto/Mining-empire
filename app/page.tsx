'use client';

import dynamic from 'next/dynamic';

const DeepMiningApp = dynamic(() => import('@/components/DeepMiningApp'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-dvh bg-slate-950 flex flex-col items-center justify-center text-cyan-400 gap-4">
      <div className="text-4xl animate-bounce">⛏️</div>
      <div className="font-mono font-bold text-sm tracking-widest uppercase">Loading Mining Empire 3D...</div>
    </div>
  )
});

export default function Page() {
  return <DeepMiningApp />;
}
