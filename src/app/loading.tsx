'use client';

export default function GlobalLoading() {
  return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
      <p className="text-slate-500 font-medium text-sm animate-pulse">Cargando datos desde la red...</p>
    </div>
  );
}
