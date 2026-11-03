'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="w-full h-dvh bg-slate-950 flex flex-col items-center justify-center text-cyan-400 gap-4 p-4 text-center">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-xl font-bold text-white">Something went wrong!</h2>
      <p className="text-sm text-slate-400 max-w-md">{error.message || "An unexpected error occurred in Mining Empire."}</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm shadow-lg cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
