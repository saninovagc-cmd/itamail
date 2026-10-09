"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CreditCard, CheckCircle2, AlertCircle, Zap, Shield, Mail, Loader2 } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  max_mailboxes: number;
  quota_per_mailbox_mb: number;
  features: string[];
  price: number;
};

type Subscription = {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string;
};

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  const supabase = createClient();

  const loadData = async () => {
    setLoading(true);
    
    // 1. Charger tous les plans
    const { data: plansData } = await supabase
      .from("plans")
      .select("*")
      .order("price", { ascending: true });
      
    if (plansData) setPlans(plansData);

    // 2. Charger l'abonnement actuel
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (userData?.org_id) {
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("org_id", userData.org_id)
          .single();
          
        if (subData) {
          setCurrentSub(subData);
        }
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubscribe = async (planId: string) => {
    setIsChangingPlan(true);
    // Pour le MVP : Simulation de la sélection d'un plan et redirection vers un checkout fictif
    setTimeout(() => {
      alert("Redirection vers la page de paiement sécurisé...");
      setIsChangingPlan(false);
    }, 1000);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  const activePlan = plans.find(p => p.id === currentSub?.plan_id);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Abonnement & Facturation</h1>
        <p className="text-slate-500">Gérez votre offre, vos capacités et vos paiements.</p>
      </div>

      {/* Résumé de l'abonnement actuel */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Zap className="h-32 w-32" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-2">
            <span className="uppercase tracking-wider text-sm font-semibold text-blue-300">Offre actuelle</span>
            {currentSub?.status === 'ACTIVE' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                ACTIF
              </span>
            )}
          </div>
          
          {activePlan ? (
            <>
              <div className="flex items-end gap-3 mb-6">
                <h2 className="text-4xl font-extrabold">{activePlan.name}</h2>
                <p className="text-slate-400 mb-1">{activePlan.price} FCFA / mois</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pb-6 border-b border-slate-700">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Capacité boîtes e-mail</p>
                  <p className="font-semibold text-lg flex items-center"><Mail className="h-4 w-4 mr-2 text-blue-400"/> Jusqu'à {activePlan.max_mailboxes} adresses</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Stockage par boîte</p>
                  <p className="font-semibold text-lg flex items-center"><Shield className="h-4 w-4 mr-2 text-blue-400"/> {activePlan.quota_per_mailbox_mb / 1024} Go / utilisateur</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Renouvellement</p>
                  <p className="font-semibold text-lg">{currentSub?.current_period_end ? new Date(currentSub.current_period_end).toLocaleDateString('fr-FR') : 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors">
                  Gérer mon paiement
                </button>
                <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors">
                  Voir les factures
                </button>
              </div>
            </>
          ) : (
            <div className="py-6">
              <h2 className="text-2xl font-bold mb-2">Aucun abonnement actif</h2>
              <p className="text-slate-400 mb-6">Veuillez choisir une offre ci-dessous pour activer vos services e-mail.</p>
            </div>
          )}
        </div>
      </div>

      {/* Liste des forfaits */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-6">Faites évoluer votre organisation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentSub?.plan_id === plan.id;
            
            return (
              <div 
                key={plan.id} 
                className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col ${
                  isCurrent ? 'border-blue-500 shadow-md' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                    VOTRE OFFRE
                  </div>
                )}
                
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-slate-900">{plan.name}</h4>
                  <div className="mt-2 flex items-baseline text-3xl font-extrabold text-slate-900">
                    {plan.price.toLocaleString('fr-FR')} <span className="ml-1 text-xl font-medium text-slate-500">FCFA</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">par mois</p>
                </div>
                
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-600 text-sm">Jusqu'à <strong>{plan.max_mailboxes} boîtes mail</strong></span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-600 text-sm"><strong>{plan.quota_per_mailbox_mb / 1024} Go</strong> par utilisateur</span>
                  </li>
                  
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                      <span className="text-slate-600 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrent || isChangingPlan}
                  className={`w-full py-3 px-4 rounded-xl font-bold transition-all ${
                    isCurrent 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  {isCurrent ? 'Offre actuelle' : 'Choisir cette offre'}
                </button>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 bg-slate-50 rounded-xl p-6 border border-slate-200 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-slate-400 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Besoin d'une offre sur-mesure ? (Entreprise)</h4>
            <p className="text-sm text-slate-600">
              Si vous avez besoin de plus de 25 boîtes e-mail ou d'un accompagnement personnalisé (migration, API), contactez notre équipe commerciale pour un devis adapté à vos besoins.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
