"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Globe, Plus, CheckCircle2, AlertTriangle, Info, Loader2, RefreshCw } from "lucide-react";

type Domain = {
  id: string;
  domain_name: string;
  status: "PENDING" | "VERIFIED" | "FAILED";
  is_primary: boolean;
  dns_status: any;
};

export default function DomainesPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [addError, setAddError] = useState("");
  
  const supabase = createClient();

  const loadDomains = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (userError) console.error("Erreur user:", userError);

        if (userData?.org_id) {
          const { data: domainsData, error: domainsError } = await supabase
            .from("domains")
            .select("*")
            .eq("org_id", userData.org_id)
            .order("created_at", { ascending: false });
            
          if (domainsError) console.error("Erreur domains:", domainsError);
          if (domainsData) setDomains(domainsData);
        }
      }
    } catch (e) {
      console.error("Exception in loadDomains:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setAddError("");

    try {
      // Validation basique
      if (!newDomain.includes(".") || newDomain.length < 4) {
        setAddError("Veuillez entrer un nom de domaine valide (ex: entreprise.com).");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAddError("Vous devez être connecté.");
        return;
      }

      let { data: userData, error: userError } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

      let orgId = userData?.org_id;

      // Si l'utilisateur n'a pas d'organisation (compte corrompu), on la crée systématiquement
      if (!orgId) {
        // On génère l'ID depuis le front-end pour éviter l'erreur RLS lors de la lecture (RETURNING)
        const newOrgId = crypto.randomUUID();

        const { error: orgError } = await supabase
          .from("organizations")
          .insert([{ 
            id: newOrgId, 
            name: "Organisation " + (user.email?.split('@')[0] || "Client") 
          }]);

        if (orgError) {
          console.error("Erreur création orga automatique:", orgError);
          setAddError("Impossible de créer l'organisation en base de données.");
          return;
        }

        orgId = newOrgId;

        // On lie l'utilisateur à sa nouvelle orga
        await supabase.from("users").insert([{
          id: user.id,
          org_id: orgId,
          role: 'ORG_ADMIN',
          full_name: user.user_metadata?.full_name || 'Administrateur',
          email: user.email
        }]);
      }

      const { error } = await supabase.from("domains").insert([
        {
          org_id: orgId,
          domain_name: newDomain.toLowerCase().trim(),
          status: "PENDING",
          is_primary: domains.length === 0,
        }
      ]);

      if (error) {
        console.error("Erreur lors de l'insertion du domaine:", error);
        if (error.code === '23505') {
          setAddError("Ce domaine est déjà enregistré.");
        } else {
          setAddError(error.message || "Une erreur s'est produite lors de l'ajout.");
        }
      } else {
        setNewDomain("");
        await loadDomains();
      }
    } catch (e: any) {
      console.error("Exception in handleAddDomain:", e);
      setAddError(e?.message || "Une exception s'est produite.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    // Pour le MVP : On simule une vérification DNS réussie
    setLoading(true);
    setTimeout(async () => {
      await supabase.from("domains").update({ status: "VERIFIED" }).eq("id", domainId);
      await loadDomains();
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Noms de domaine</h1>
          <p className="text-slate-500">Gérez les domaines associés à vos boîtes e-mail.</p>
        </div>
      </div>

      {/* Ajouter un domaine */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
          <Plus className="h-5 w-5 mr-2 text-slate-400" />
          Ajouter un nouveau domaine
        </h2>
        <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="ex: mondomaine.bj"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isAdding}
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !newDomain}
            className="inline-flex justify-center items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {isAdding ? <Loader2 className="h-5 w-5 animate-spin" /> : "Ajouter"}
          </button>
        </form>
        {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
      </div>

      {/* Liste des domaines */}
      <div className="space-y-4">
        {domains.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-xl border border-dashed border-slate-300">
            <Globe className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Aucun domaine</h3>
            <p className="text-slate-500">Commencez par ajouter votre nom de domaine ci-dessus.</p>
          </div>
        ) : (
          domains.map((domain) => (
            <div key={domain.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg mr-4 ${
                    domain.status === 'VERIFIED' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center">
                      {domain.domain_name}
                      {domain.is_primary && (
                        <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Principal
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center mt-1">
                      {domain.status === 'VERIFIED' ? (
                        <span className="flex items-center text-sm text-green-600 font-medium">
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Connecté et sécurisé
                        </span>
                      ) : (
                        <span className="flex items-center text-sm text-orange-600 font-medium">
                          <AlertTriangle className="h-4 w-4 mr-1" /> Vérification DNS en attente
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => handleVerify(domain.id)}
                    disabled={domain.status === 'VERIFIED'}
                    className={`flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border rounded-lg transition-colors text-sm font-medium ${
                      domain.status === 'VERIFIED' 
                        ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${domain.status !== 'VERIFIED' ? 'text-blue-500' : ''}`} />
                    {domain.status === 'VERIFIED' ? 'Vérifié' : 'Vérifier'}
                  </button>
                </div>
              </div>

              {/* Instructions DNS si PENDING */}
              {domain.status !== 'VERIFIED' && (
                <div className="p-6 bg-slate-50">
                  <div className="flex items-start mb-4">
                    <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700">
                      Pour utiliser ce domaine pour vos e-mails, connectez-vous au bureau d'enregistrement de votre domaine (ex: OVH, GoDaddy) et ajoutez les enregistrements DNS suivants :
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border border-slate-200 bg-white rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-medium border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Nom (Hôte)</th>
                          <th className="px-4 py-3">Valeur (Cible)</th>
                          <th className="px-4 py-3">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-600">
                        <tr>
                          <td className="px-4 py-3 font-medium">TXT (Vérification)</td>
                          <td className="px-4 py-3">@</td>
                          <td className="px-4 py-3 font-mono text-xs break-all">ita-mail-verification={domain.id}</td>
                          <td className="px-4 py-3">
                            <span className="text-orange-500 font-medium">En attente</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium">MX</td>
                          <td className="px-4 py-3">@</td>
                          <td className="px-4 py-3 font-mono text-xs">mx1.ita-mail.bj (Priorité 10)</td>
                          <td className="px-4 py-3">
                            <span className="text-orange-500 font-medium">En attente</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium">TXT (SPF)</td>
                          <td className="px-4 py-3">@</td>
                          <td className="px-4 py-3 font-mono text-xs break-all">v=spf1 include:spf.ita-mail.bj ~all</td>
                          <td className="px-4 py-3">
                            <span className="text-slate-400">Optionnel</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
