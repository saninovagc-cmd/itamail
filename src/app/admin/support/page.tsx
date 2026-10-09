import { Construction } from 'lucide-react';

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="h-16 w-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
        <Construction className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Module en construction</h1>
      <p className="text-slate-500 max-w-md mx-auto">Cette section de la console d'administration est en cours de développement pour la V2 de l'application.</p>
    </div>
  );
}
