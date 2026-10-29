"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Building2, 
  Calendar, 
  DollarSign, 
  Sparkles,
  Loader2,
  X,
  Mail,
  Edit
} from "lucide-react";
import { calculateSubscriptionPrice, formatFCFA, BillingInterval } from "@/lib/pricing";

type AdminSubItem = {
  org_id: string;
  org_name: string;
  sub_id?: string;
  plan_name: string;
  interval: BillingInterval;
  mailboxes_count: number;
  amount: number;
  status: "ACTIVE" | "PENDING" | "EXPIRED";
  current_period_end?: string | null;
  boxes_created_count: number;
};

export default function AbonnementsAdminPage() {
  const [items, setItems] = useState<AdminSubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal de gestion manuelle de l'abonnement par le Super Admin
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<AdminSubItem | null>(null);
  const [modalInterval, setModalInterval] = useState<BillingInterval>("monthly");
  const [modalBoxesCount, setModalBoxesCount] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Récupérer toutes les organisations
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, stripe_customer_id, created_at")
        .order("created_at", { ascending: false });

      if (!orgs || orgs.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // 2. Récupérer les abonnements
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*");

      // 3. Récupérer le nombre de boîtes par organisation
      const { data: mailboxes } = await supabase
        .from("mailboxes")
        .select("org_id");

      const subList: AdminSubItem[] = orgs.map((org) => {
        const sub = subs?.find((s) => s.org_id === org.id);
        const boxesCount = mailboxes?.filter((m) => m.org_id === org.id).length || 0;

        let interval: BillingInterval = "monthly";
        let count = 1;
        let amount = 5000;

        // Analyser les métadonnées (ex: fedapay:tx|interval|count|amount)
        if (org.stripe_customer_id && org.stripe_customer_id.startsWith("fedapay:")) {
          const parts = org.stripe_customer_id.replace("fedapay:", "").split("|");
          if (parts.length >= 4) {
            interval = parts[1] as BillingInterval;
            count = parseInt(parts[2]) || 1;
            amount = parseInt(parts[3]) || 5000;
          }
        }

        const calc = calculateSubscriptionPrice(count, interval);
        amount = calc.totalAmount;

        const isActive = sub && (sub.status === "ACTIVE" || sub.status === "active");

        return {
          org_id: org.id,
          org_name: org.name || "Organisation sans nom",
          sub_id: sub?.id,
          plan_name: `Formule ${interval === "yearly" ? "Annuelle" : "Mensuelle"} (${count} boîte${count > 1 ? "s" : ""})`,
          interval: interval,
          mailboxes_count: count,
          amount: amount,
          status: isActive ? "ACTIVE" : sub ? "EXPIRED" : "PENDING",
          current_period_end: sub?.current_period_end || null,
          boxes_created_count: boxesCount,
        };
      });

      setItems(subList);
    } catch (e) {
      console.error("Erreur chargement abonnements admin:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEditModal = (item: AdminSubItem) => {
    setSelectedOrg(item);
    setModalInterval(item.interval || "monthly");
    setModalBoxesCount(item.mailboxes_count || 1);
    setModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!selectedOrg) return;
    setIsSaving(true);
    try {
      const calc = calculateSubscriptionPrice(modalBoxesCount, modalInterval);

      // Récupérer un plan_id existant
      const { data: existingPlan } = await supabase.from("plans").select("id").limit(1).single();
      const planId = existingPlan?.id || "210e1848-3403-4ed7-838e-b8ca5884d166";

      // Calculer la nouvelle date d'expiration
      const expirationDate = new Date();
      if (modalInterval === "yearly") {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      } else {
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      }

      if (selectedOrg.sub_id) {
        await supabase
          .from("subscriptions")
          .update({
            plan_id: planId,
            status: "ACTIVE",
            current_period_end: expirationDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedOrg.sub_id);
      } else {
        await supabase.from("subscriptions").insert({
          org_id: selectedOrg.org_id,
          plan_id: planId,
          status: "ACTIVE",
          current_period_end: expirationDate.toISOString(),
        });
      }

      // Enregistrer les métadonnées dans l'organisation
      const metaRef = `fedapay:admin_manual|${modalInterval}|${calc.mailboxesCount}|${calc.totalAmount}`;
      await supabase
        .from("organizations")
        .update({
          stripe_customer_id: metaRef,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedOrg.org_id);

      setModalOpen(false);
      await loadData();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la mise à jour de l'abonnement.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredItems = items.filter((item) =>
    item.org_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistiques globales
  const activeSubsCount = items.filter((i) => i.status === "ACTIVE").length;
  const totalMRR = items
    .filter((i) => i.status === "ACTIVE")
    .reduce((acc, curr) => {
      const monthlyAmount = curr.interval === "yearly" ? curr.amount / 12 : curr.amount;
      return acc + monthlyAmount;
    }, 0);
  const totalBoxesAllocated = items
    .filter((i) => i.status === "ACTIVE")
    .reduce((acc, curr) => acc + curr.mailboxes_count, 0);

  const modalCalc = calculateSubscriptionPrice(modalBoxesCount, modalInterval);

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER PAGE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suivi des Abonnements</h1>
          <p className="text-slate-500">
            Supervisez les forfaits actifs, les montants FedaPay et les renouvellements.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une organisation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 bg-white"
          />
        </div>
      </div>

      {/* STATS RAPIDES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Abonnements Actifs</p>
            <p className="text-2xl font-extrabold text-slate-900">{activeSubsCount} / {items.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenus Récurrents (MRR)</p>
            <p className="text-2xl font-extrabold text-slate-900">{formatFCFA(Math.round(totalMRR))}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Boîtes Mails Allouées</p>
            <p className="text-2xl font-extrabold text-slate-900">{totalBoxesAllocated} boîtes</p>
          </div>
        </div>
      </div>

      {/* TABLEAU DES ABONNEMENTS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Organisation (Client)</th>
                <th className="px-6 py-4">Forfait & Boîtes</th>
                <th className="px-6 py-4">Montant Tarifaire</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Renouvellement le</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Chargement des abonnements...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Aucun abonnement trouvé.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isActive = item.status === "ACTIVE";

                  return (
                    <tr key={item.org_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center mr-3 font-bold text-xs ${
                              isActive
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{item.org_name}</span>
                            <span className="text-xs text-slate-400">
                              {item.boxes_created_count} boîte{item.boxes_created_count > 1 ? "s" : ""} créée{item.boxes_created_count > 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {item.plan_name}
                      </td>

                      <td className="px-6 py-4 text-slate-900 font-bold">
                        {formatFCFA(item.amount)}
                        <span className="text-xs text-slate-400 font-normal block">
                          par {item.interval === "yearly" ? "an" : "mois"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : item.status === "EXPIRED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isActive ? (
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                          )}
                          {isActive ? "Actif" : item.status === "EXPIRED" ? "Expiré" : "En attente"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {item.current_period_end ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(item.current_period_end).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Non défini</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Gérer
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

      {/* MODAL GESTION MANUELLE ABONNEMENT PAR L'ADMIN */}
      {modalOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Gérer l&apos;Abonnement</h3>
                <p className="text-sm text-slate-500 font-semibold">{selectedOrg.org_name}</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Choix Formule */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Formule
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModalInterval("monthly")}
                    className={`p-3 rounded-xl border-2 text-left font-bold text-sm ${
                      modalInterval === "monthly"
                        ? "border-blue-600 bg-blue-50/50 text-blue-900"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    Mensuel
                    <span className="block text-xs font-normal text-slate-500 mt-0.5">5k + 2.5k/mail</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalInterval("yearly")}
                    className={`p-3 rounded-xl border-2 text-left font-bold text-sm ${
                      modalInterval === "yearly"
                        ? "border-blue-600 bg-blue-50/50 text-blue-900"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    Annuel (-20%)
                    <span className="block text-xs font-normal text-slate-500 mt-0.5">50k + 25k/mail</span>
                  </button>
                </div>
              </div>

              {/* Nombre de boîtes allouées */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Nombre de boîtes e-mails autorisées
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={modalBoxesCount}
                  onChange={(e) => setModalBoxesCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Récapitulatif calcul */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>1ère boîte :</span>
                  <span className="font-semibold text-slate-800">{formatFCFA(modalCalc.firstMailboxPrice)}</span>
                </div>
                {modalCalc.additionalMailboxesCount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>{modalCalc.additionalMailboxesCount} boîte(s) add. :</span>
                    <span className="font-semibold text-slate-800">{formatFCFA(modalCalc.additionalTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200 font-extrabold text-blue-600 text-base">
                  <span>Montant total :</span>
                  <span>{formatFCFA(modalCalc.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={isSaving}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer et Activer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
