"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CreditCard, Search, MoreHorizontal, CheckCircle2, AlertCircle } from "lucide-react";

export default function AbonnementsAdminPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubs() {
      const supabase = createClient();
      // On récupère aussi le nom du plan et l'organisation (client)
      const { data } = await supabase
        .from('subscriptions')
        .select('*, organizations(name), plans(name, price)')
        .order('created_at', { ascending: false });
      
      if (data) setSubs(data);
      setLoading(false);
    }
    fetchSubs();
  }, []);

  if (loading) return <div className="animate-pulse p-8">Chargement des abonnements...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suivi des Abonnements</h1>
          <p className="text-slate-500">Supervisez les forfaits actifs et les dates de renouvellement.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher une organisation..." 
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Organisation (Client)</th>
                <th className="px-6 py-4">Forfait</th>
                <th className="px-6 py-4">Montant Mensuel</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Renouvellement le</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Aucun abonnement trouvé.</td>
                </tr>
              ) : (
                subs.map((sub) => {
                  const isActive = sub.status === 'ACTIVE' || sub.status === 'active';
                  
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-slate-900">{sub.organizations?.name || "Client Inconnu"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {sub.plans?.name || sub.plan || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {sub.plans?.price ? `${sub.plans.price} FCFA` : "15 000 FCFA"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isActive ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                          {isActive ? 'Actif' : 'Expiré / Annulé'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('fr-FR') : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-blue-600 transition-colors">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
