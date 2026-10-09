"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Building2, Globe, Mail, CreditCard, Activity, ArrowUpRight, LifeBuoy } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState<any>(null);

  useEffect(() => {
    async function loadDashboardData() {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Dans une vraie app, on ferait une jointure complète.
        // Ici, on simule certaines données agrégées pour le MVP si elles sont vides.
        const { data: userData } = await supabase
          .from('users')
          .select('org_id')
          .eq('id', user.id)
          .single();

        if (userData?.org_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', userData.org_id)
            .single();
            
          // Récupérer le vrai domaine
          const { data: domains } = await supabase.from('domains').select('id, name').eq('organization_id', userData.org_id);
          const primaryDomain = domains && domains.length > 0 ? domains[0].name : "Aucun domaine lié";
          const domainIds = domains?.map(d => d.id) || [];
          
          // Compter les vraies boîtes mail
          let mailboxesCount = 0;
          if (domainIds.length > 0) {
            const { count } = await supabase.from('mailboxes').select('*', { count: 'exact', head: true }).in('domain_id', domainIds);
            mailboxesCount = count || 0;
          }
          
          // Récupérer le vrai abonnement
          const { data: sub } = await supabase.from('subscriptions').select('plan, current_period_end, status').eq('organization_id', userData.org_id).single();
          const currentPlan = sub?.plan || "STARTER";
          
          // Capacités basées sur le plan réel
          const limits: Record<string, {mailboxes: number, storage: number}> = {
            "STARTER": { mailboxes: 3, storage: 5 },
            "PRO": { mailboxes: 15, storage: 50 },
            "BUSINESS": { mailboxes: 50, storage: 200 }
          };
          
          const planLimits = limits[currentPlan] || limits["STARTER"];
            
          setOrgData({
            name: org?.name || "Mon Entreprise",
            domain: primaryDomain,
            plan: currentPlan,
            mailboxesUsed: mailboxesCount,
            mailboxesLimit: planLimits.mailboxes,
            storageUsed: 0, // À calculer selon usage réel dans une V2
            storageLimit: planLimits.storage,
            expirationDate: sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('fr-FR') : "N/A",
            status: sub?.status === 'active' ? "Actif" : "En attente"
          });
        }
      }
      setLoading(false);
    }
    
    loadDashboardData();
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-slate-200 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>)}
      </div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-500">Bienvenue dans votre espace {orgData?.name}</p>
        </div>
        <Link 
          href="/dashboard/boites-mail"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Créer une boîte mail
        </Link>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {orgData?.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Organisation</p>
          <h3 className="text-lg font-bold text-slate-900 truncate">{orgData?.name}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Globe className="h-5 w-5" />
            </div>
            <Link href="/dashboard/domaines" className="text-xs text-blue-600 hover:underline flex items-center">
              Gérer <ArrowUpRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
          <p className="text-sm text-slate-500 font-medium">Domaine principal</p>
          <h3 className="text-lg font-bold text-slate-900 truncate">{orgData?.domain}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">
              {orgData?.mailboxesUsed} / {orgData?.mailboxesLimit}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Boîtes mail utilisées</p>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
            <div 
              className="bg-orange-500 h-1.5 rounded-full" 
              style={{ width: `${(orgData?.mailboxesUsed / orgData?.mailboxesLimit) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CreditCard className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-500">
              Exp. {orgData?.expirationDate}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Abonnement actuel</p>
          <h3 className="text-lg font-bold text-slate-900">Plan {orgData?.plan}</h3>
        </div>
      </div>

      {/* Sections secondaires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-slate-400" />
            Utilisation du stockage
          </h3>
          <div className="flex items-end justify-between mb-2">
            <span className="text-3xl font-bold text-slate-900">{orgData?.storageUsed} <span className="text-lg text-slate-500 font-medium">Go</span></span>
            <span className="text-sm text-slate-500 mb-1">sur {orgData?.storageLimit} Go total</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${(orgData?.storageUsed / orgData?.storageLimit) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-4">La capacité de stockage est partagée entre toutes les boîtes e-mail de votre organisation.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/domaines" className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors group">
              <Globe className="h-5 w-5 text-slate-400 group-hover:text-blue-600 mr-3" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Lier un domaine</span>
            </Link>
            <Link href="/dashboard/boites-mail" className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors group">
              <Mail className="h-5 w-5 text-slate-400 group-hover:text-blue-600 mr-3" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Gérer les adresses</span>
            </Link>
            <Link href="/dashboard/abonnement" className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors group">
              <CreditCard className="h-5 w-5 text-slate-400 group-hover:text-blue-600 mr-3" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Changer d'offre</span>
            </Link>
            <Link href="/dashboard/support" className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors group">
              <LifeBuoy className="h-5 w-5 text-slate-400 group-hover:text-blue-600 mr-3" />
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Contacter l'aide</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
