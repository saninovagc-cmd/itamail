"use client";

import { Building2, Globe, Mail, CreditCard, Users, TrendingUp, AlertTriangle } from "lucide-react";

export default function AdminDashboardPage() {
  // Dans un vrai flux, on ferait des COUNT() via le client Supabase
  // Ici on simule les données globales de la plateforme
  const stats = {
    totalClients: 42,
    activeDomains: 38,
    activeMailboxes: 412,
    monthlyRevenue: 1250000, // En FCFA
    openTickets: 3,
    expiringSubs: 5
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vue d'ensemble de la plateforme</h1>
        <p className="text-slate-500">Performances et métriques globales de ITA MAIL.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+12% ce mois</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Organisations Clientes</p>
          <h3 className="text-3xl font-bold text-slate-900">{stats.totalClients}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Globe className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">Enregistrés</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Domaines Actifs</p>
          <h3 className="text-3xl font-bold text-slate-900">{stats.activeDomains}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+45 adresses</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Boîtes Mail Hébergées</p>
          <h3 className="text-3xl font-bold text-slate-900">{stats.activeMailboxes}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">Revenu Mensuel Récurrent</p>
          <h3 className="text-3xl font-bold text-slate-900">{stats.monthlyRevenue.toLocaleString('fr-FR')} <span className="text-lg text-slate-500">FCFA</span></h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Actions urgentes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
              Suivi Requis
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="p-4 hover:bg-slate-50 flex justify-between items-center transition-colors">
              <div>
                <p className="font-medium text-slate-800">Tickets de support ouverts</p>
                <p className="text-sm text-slate-500">Nécessitent une réponse de l'équipe technique</p>
              </div>
              <div className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full">{stats.openTickets}</div>
            </div>
            <div className="p-4 hover:bg-slate-50 flex justify-between items-center transition-colors">
              <div>
                <p className="font-medium text-slate-800">Abonnements expirant sous 7 jours</p>
                <p className="text-sm text-slate-500">Relances automatiques en cours</p>
              </div>
              <div className="bg-orange-100 text-orange-700 font-bold px-3 py-1 rounded-full">{stats.expiringSubs}</div>
            </div>
            <div className="p-4 hover:bg-slate-50 flex justify-between items-center transition-colors">
              <div>
                <p className="font-medium text-slate-800">Erreurs de propagation DNS</p>
                <p className="text-sm text-slate-500">Domaines bloqués à l'étape PENDING</p>
              </div>
              <div className="bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-full">2</div>
            </div>
          </div>
        </div>

        {/* Dernières inscriptions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Dernières organisations inscrites</h3>
            <button className="text-sm text-blue-600 font-medium hover:underline">Voir tout</button>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { nom: "Pharmacie Nouvelle", plan: "BUSINESS", date: "Aujourd'hui" },
              { nom: "Cabinet d'Avocats Koffi", plan: "PRO", date: "Hier" },
              { nom: "Startup Tech Cotonou", plan: "STARTER", date: "Il y a 3 jours" }
            ].map((client, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center mr-3">
                    <Building2 className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{client.nom}</p>
                    <p className="text-xs text-slate-500">Inscrit : {client.date}</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded">
                  {client.plan}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
