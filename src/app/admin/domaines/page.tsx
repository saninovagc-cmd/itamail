"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Globe, Search, MoreHorizontal } from "lucide-react";

export default function DomainesAdminPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDomains() {
      const supabase = createClient();
      const { data } = await supabase
        .from('domains')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false });
      
      if (data) setDomains(data);
      setLoading(false);
    }
    fetchDomains();
  }, []);

  if (loading) return <div className="animate-pulse p-8">Chargement des domaines...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Domaines Enregistrés</h1>
          <p className="text-slate-500">Supervisez tous les domaines liés par vos clients.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher un domaine..." 
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nom de Domaine</th>
                <th className="px-6 py-4">Organisation (Client)</th>
                <th className="px-6 py-4">Statut DNS</th>
                <th className="px-6 py-4">Date d'ajout</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Aucun domaine trouvé.</td>
                </tr>
              ) : (
                domains.map((domain) => (
                  <tr key={domain.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                          <Globe className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-slate-900">{domain.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {domain.organizations?.name || "Client Inconnu"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        domain.status === 'verified' ? 'bg-green-100 text-green-800' : 
                        domain.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {domain.status === 'verified' ? 'Vérifié' : domain.status === 'failed' ? 'Échec' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(domain.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-blue-600 transition-colors">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
