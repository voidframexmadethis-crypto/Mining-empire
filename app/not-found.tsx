'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="w-full h-dvh bg-slate-950 flex flex-col items-center justify-center text-cyan-400 gap-4 p-4 text-center">
      <div className="text-4xl">⛏️</div>
      <h2 className="text-xl font-bold text-white">Page Not Found</h2>
      <p className="text-sm text-slate-400">The mining tunnel you are looking for does not exist.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm shadow-lg cursor-pointer"
      >
        Return to Mining Empire
      </Link>
    </div>
  );
}
