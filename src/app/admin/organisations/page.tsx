"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Building2, Search, MoreHorizontal } from "lucide-react";

export default function OrganisationsAdminPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrgs() {
      const supabase = createClient();
      const { data } = await supabase
        .from('organizations')
        .select('*, subscriptions(plan, status)')
        .order('created_at', { ascending: false });
      
      if (data) setOrgs(data);
      setLoading(false);
    }
    fetchOrgs();
  }, []);

  if (loading) return <div className="animate-pulse p-8">Chargement des organisations...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organisations Clientes</h1>
          <p className="text-slate-500">Gérez les entreprises inscrites sur ITA MAIL.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher un client..." 
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Organisation</th>
                <th className="px-6 py-4">ID Supabase</th>
                <th className="px-6 py-4">Abonnement</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Date d'inscription</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Aucune organisation trouvée.</td>
                </tr>
              ) : (
                orgs.map((org) => {
                  const sub = org.subscriptions && org.subscriptions.length > 0 ? org.subscriptions[0] : null;
                  return (
                    <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-slate-900">{org.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{org.id.split('-')[0]}...</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {sub?.plan || 'STARTER'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {sub?.status === 'active' ? 'Actif' : 'Actif (Défaut)'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(org.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-blue-600 transition-colors">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
