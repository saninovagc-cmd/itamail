"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Search, MoreHorizontal } from "lucide-react";

export default function BoitesMailAdminPage() {
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMailboxes() {
      const supabase = createClient();
      const { data } = await supabase
        .from('mailboxes')
        .select('*, domains(name, organizations(name))')
        .order('created_at', { ascending: false });
      
      if (data) setMailboxes(data);
      setLoading(false);
    }
    fetchMailboxes();
  }, []);

  if (loading) return <div className="animate-pulse p-8">Chargement des boîtes e-mail...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Boîtes e-mail hébergées</h1>
          <p className="text-slate-500">Gérez l'ensemble des adresses e-mail créées par les clients.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher une adresse..." 
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Adresse e-mail</th>
                <th className="px-6 py-4">Organisation (Client)</th>
                <th className="px-6 py-4">Domaine</th>
                <th className="px-6 py-4">Date de création</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mailboxes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Aucune boîte e-mail trouvée.</td>
                </tr>
              ) : (
                mailboxes.map((mb) => (
                  <tr key={mb.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-3">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-slate-900">{mb.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {mb.domains?.organizations?.name || "Client Inconnu"}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {mb.domains?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(mb.created_at).toLocaleDateString('fr-FR')}
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
