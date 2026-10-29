"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Shield, 
  Mail, 
  Loader2, 
  Plus, 
  Minus, 
  Smartphone, 
  Lock, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { calculateSubscriptionPrice, formatFCFA, BillingInterval } from "@/lib/pricing";

type OrgSubscription = {
  id: string;
  status: string;
  current_period_end: string;
  interval: BillingInterval;
  mailboxes_count: number;
  amount: number;
};

function SubscriptionContent() {
  const searchParams = useSearchParams();
  const [currentSub, setCurrentSub] = useState<OrgSubscription | null>(null);
  const [currentBoxesCreated, setCurrentBoxesCreated] = useState<number>(0);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("Mon Organisation");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Configurateur de souscription
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [mailboxesCount, setMailboxesCount] = useState<number>(1);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [payerName, setPayerName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoTxId, setDemoTxId] = useState<string>("");

  const supabase = createClient();
  const calc = calculateSubscriptionPrice(mailboxesCount, interval);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setUserEmail(user.email || "");
      setUserName(user.user_metadata?.full_name || "Client");
      setPayerName(user.user_metadata?.full_name || "");

      const { data: userData } = await supabase
        .from("users")
        .select("org_id, full_name, organizations(id, name, stripe_customer_id)")
        .eq("id", user.id)
        .single();

      if (userData?.org_id) {
        const foundOrgId = userData.org_id;
        setOrgId(foundOrgId);
        const orgData: any = userData.organizations;
        if (orgData?.name) setOrgName(orgData.name);

        // Compter les boîtes mail existantes créées
        const { count: boxesCount } = await supabase
          .from("mailboxes")
          .select("id", { count: "exact", head: true })
          .eq("org_id", foundOrgId);
        
        setCurrentBoxesCreated(boxesCount || 0);

        // Charger l'abonnement en base
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("org_id", foundOrgId)
          .maybeSingle();

        if (subData) {
          // Analyser les métadonnées enregistrées (ex: stripe_customer_id = fedapay:tx|interval|count|amount)
          let metaInterval: BillingInterval = "monthly";
          let metaCount = 1;
          let metaAmount = 5000;

          if (orgData?.stripe_customer_id && orgData.stripe_customer_id.startsWith("fedapay:")) {
            const parts = orgData.stripe_customer_id.replace("fedapay:", "").split("|");
            if (parts.length >= 4) {
              metaInterval = parts[1] as BillingInterval;
              metaCount = parseInt(parts[2]) || 1;
              metaAmount = parseInt(parts[3]) || 5000;
            }
          }

          setCurrentSub({
            id: subData.id,
            status: subData.status,
            current_period_end: subData.current_period_end,
            interval: metaInterval,
            mailboxes_count: metaCount,
            amount: metaAmount,
          });

          // Pré-calibrer le configurateur sur le nombre actuel
          setMailboxesCount(Math.max(1, metaCount));
          setInterval(metaInterval);
        }
      }
    } catch (err) {
      console.error("Erreur de chargement abonnement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Vérifier si retour d'un paiement FedaPay réussi (paramètre d'URL callback)
    const paymentStatus = searchParams.get("payment");
    const paramOrgId = searchParams.get("org_id");
    const paramInterval = (searchParams.get("interval") as BillingInterval) || "monthly";
    const paramCount = parseInt(searchParams.get("count") || "1");

    if (paymentStatus === "success" && paramOrgId) {
      setPaymentSuccessNotice(true);
      fetch("/api/fedapay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: paramOrgId,
          interval: paramInterval,
          mailboxesCount: paramCount,
          transactionId: searchParams.get("id") || "callback",
        }),
      }).then(() => {
        loadData();
      });
    }
  }, [searchParams]);

  // Initialiser la transaction FedaPay
  const handleInitiatePayment = async () => {
    if (!orgId) {
      alert("Votre compte utilisateur n'est pas lié à une organisation.");
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch("/api/fedapay/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          mailboxesCount,
          interval,
          customerEmail: userEmail,
          customerName: payerName || userName || "Client ITA MAIL",
          customerPhone: phoneNumber || "+22990000000",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'initialisation du paiement.");
      }

      // Si checkoutUrl est disponible (Live ou Sandbox avec clés réelles FedaPay)
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // Si la clé API est en attente, ouvrir le simulateur d'activation immédiate
      if (data.mocked) {
        setDemoTxId(data.transactionId);
        setDemoModalOpen(true);
      }
    } catch (err: any) {
      console.error("Erreur paiement:", err);
      alert(err?.message || "Impossible d'initier le paiement FedaPay.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirmer l'activation de test (en attendant les clés API réelles FedaPay)
  const handleConfirmDemoActivation = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/fedapay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          interval,
          mailboxesCount,
          transactionId: demoTxId,
          mocked: true,
        }),
      });

      if (res.ok) {
        setDemoModalOpen(false);
        setPaymentSuccessNotice(true);
        await loadData();
      } else {
        alert("Erreur lors de l'activation.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isSubActive = currentSub?.status === "ACTIVE" || currentSub?.status === "active";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      
      {/* BANNIÈRE DE SUCCÈS APRÈS PAIEMENT */}
      {paymentSuccessNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-base">Paiement FedaPay confirmé avec succès !</h4>
              <p className="text-sm text-emerald-700">
                Votre abonnement ITA MAIL est désormais actif. Vos boîtes e-mails sont débloquées.
              </p>
            </div>
          </div>
          <button
            onClick={() => setPaymentSuccessNotice(false)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline ml-4"
          >
            Fermer
          </button>
        </div>
      )}

      {/* TITRE DE LA PAGE */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Abonnement & Facturation</h1>
        <p className="text-slate-500">
          Gérez l&apos;offre de votre organisation ({orgName}) et réglez vos forfaits via FedaPay.
        </p>
      </div>

      {/* CARTE D'ÉTAT DE L'ABONNEMENT ACTUEL */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white overflow-hidden relative shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Zap className="h-36 w-36" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <span className="uppercase tracking-wider text-xs font-bold text-blue-400">
              Statut de l&apos;organisation
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isSubActive
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
              }`}
            >
              {isSubActive ? "ABONNEMENT ACTIF" : "AUCUN ABONNEMENT ACTIF"}
            </span>
          </div>

          {isSubActive && currentSub ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight">
                    Formule {currentSub.interval === "yearly" ? "Annuelle" : "Mensuelle"}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {formatFCFA(currentSub.amount)} / {currentSub.interval === "yearly" ? "an" : "mois"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-800">
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase mb-1">Boîtes e-mails allouées</p>
                  <p className="font-bold text-lg text-white flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-blue-400" />
                    {currentBoxesCreated} / {currentSub.mailboxes_count} créées
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase mb-1">Stockage par boîte</p>
                  <p className="font-bold text-lg text-white flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-blue-400" />
                    5 Go / utilisateur
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase mb-1">Prochain renouvellement</p>
                  <p className="font-bold text-lg text-white">
                    {new Date(currentSub.current_period_end).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="py-2">
              <h2 className="text-2xl font-bold mb-2">Activez votre abonnement professionnel</h2>
              <p className="text-slate-400 text-sm max-w-xl">
                Pour créer vos boîtes mails personnalisées (ex: contact@{orgName.toLowerCase().replace(/\s+/g, "")}.com) et profiter du Webmail, configurez votre offre ci-dessous et réglez en toute simplicité via FedaPay.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CONFIGURATEUR DE SOUSCRIPTION / RENOUVELLEMENT */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-8 lg:p-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {isSubActive ? "Modifier ou renouveler votre abonnement" : "Configurer votre abonnement"}
            </h3>
            <p className="text-sm text-slate-500">
              Tarification officielle : 5.000 F pour le premier mail, 2.500 F par mail supplémentaire.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLONNE GAUCHE : CHOIX FORMULE & NOMBRE DE BOÎTES */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Périodicité */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Période de facturation
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInterval("monthly")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    interval === "monthly"
                      ? "border-blue-600 bg-blue-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="font-bold text-slate-900 text-sm">Formule Mensuelle</p>
                  <p className="text-xs text-slate-500 mt-1">5 000 F CFA pour le 1er mail</p>
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">+ 2 500 F / mail add.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setInterval("yearly")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                    interval === "yearly"
                      ? "border-blue-600 bg-blue-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-sm">
                    -20% (2 mois offerts)
                  </span>
                  <p className="font-bold text-slate-900 text-sm">Formule Annuelle</p>
                  <p className="text-xs text-slate-500 mt-1">50 000 F CFA pour le 1er mail</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-0.5">+ 25 000 F / mail add.</p>
                </button>
              </div>
            </div>

            {/* Sélecteur de nombre de boîtes mail */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Nombre de boîtes e-mails pour l&apos;organisation
              </label>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setMailboxesCount(Math.max(1, mailboxesCount - 1))}
                  className="h-10 w-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  disabled={mailboxesCount <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>

                <div className="flex-1 text-center">
                  <span className="text-3xl font-extrabold text-slate-900">{mailboxesCount}</span>
                  <span className="text-xs font-medium text-slate-500 ml-2">boîte{mailboxesCount > 1 ? "s" : ""} e-mail</span>
                </div>

                <button
                  type="button"
                  onClick={() => setMailboxesCount(mailboxesCount + 1)}
                  className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-md shadow-blue-500/20"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Coordonnées client pour FedaPay */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Coordonnées de règlement
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nom / Entreprise</label>
                  <input
                    type="text"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="Nom du responsable"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Numéro Mobile Money (Optionnel)</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="ex: +229 97 00 00 00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* COLONNE DROITE : RÉSUMÉ & BOUTON FEDAPAY */}
          <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl p-6 border border-slate-200/80 space-y-5">
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Récapitulatif de la commande
            </h4>

            <div className="space-y-3 text-sm border-b border-slate-200 pb-4">
              <div className="flex justify-between text-slate-600">
                <span>1ère boîte de l&apos;organisation</span>
                <span className="font-semibold text-slate-900">{formatFCFA(calc.firstMailboxPrice)}</span>
              </div>

              {calc.additionalMailboxesCount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>{calc.additionalMailboxesCount} boîte{calc.additionalMailboxesCount > 1 ? "s" : ""} add. ({formatFCFA(calc.additionalMailboxPrice)})</span>
                  <span className="font-semibold text-slate-900">{formatFCFA(calc.additionalTotal)}</span>
                </div>
              )}

              {interval === "yearly" && calc.savingsVsMonthly > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold text-xs pt-1">
                  <span>Économie annuelle (-20%)</span>
                  <span>- {formatFCFA(calc.savingsVsMonthly)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total à payer</span>
                <p className="text-xs text-slate-400">TTC en Francs CFA</p>
              </div>
              <span className="text-3xl font-extrabold text-blue-600">
                {formatFCFA(calc.totalAmount)}
              </span>
            </div>

            {/* Bouton de paiement FedaPay */}
            <button
              onClick={handleInitiatePayment}
              disabled={isProcessing}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-base shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connexion à FedaPay...
                </>
              ) : (
                <>
                  <Smartphone className="h-5 w-5" />
                  Payer avec FedaPay
                </>
              )}
            </button>

            {/* Badges FedaPay */}
            <div className="pt-2 text-center">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
                <Lock className="h-3 w-3 text-slate-400" /> Passerelle FedaPay certifiée
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 text-[10px] text-slate-600 font-medium">
                {['MTN MoMo', 'Moov Money', 'Celtiis Cash', 'Orange', 'Wave', 'Visa / Mastercard'].map((m) => (
                  <span key={m} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                    {m}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL SIMULATION / TEST (EN ATTENDANT LES CLÉS LIVE FEDAPAY) */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Passerelle FedaPay (Test)</h3>
                <p className="text-xs text-slate-500">Validation de la transaction en mode bac à sable</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Organisation :</span>
                <span className="font-semibold text-slate-800">{orgName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Boîtes incluses :</span>
                <span className="font-semibold text-slate-800">{mailboxesCount} boîte{mailboxesCount > 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Formule :</span>
                <span className="font-semibold text-slate-800">{interval === "yearly" ? "Annuelle" : "Mensuelle"}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-extrabold text-blue-600">
                <span>Montant :</span>
                <span>{formatFCFA(calc.totalAmount)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              💡 <strong>Note technique :</strong> Les routes API FedaPay sont 100% connectées. Dès que vous ajouterez vos clés FedaPay dans vos variables d&apos;environnement, cette fenêtre sera automatiquement remplacée par la vraie page de paiement Mobile Money. Cliquez ci-dessous pour simuler la réussite du paiement et activer l&apos;abonnement.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDemoModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDemoActivation}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider le paiement"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <SubscriptionContent />
    </Suspense>
  );
}
