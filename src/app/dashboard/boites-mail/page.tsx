"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Plus, Search, MoreVertical, HardDrive, Shield, AlertCircle, Loader2 } from "lucide-react";

type Domain = { id: string; domain_name: string; status: string };
type Mailbox = {
  id: string;
  address: string;
  quota_mb: number;
  usage_mb: number;
  status: "ACTIVE" | "SUSPENDED";
  created_at: string;
};

export default function MailboxesPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States pour la création
  const [isAdding, setIsAdding] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [password, setPassword] = useState("");
  const [addError, setAddError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const supabase = createClient();

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (userData?.org_id) {
        // Charger les domaines
        const { data: domainsData } = await supabase
          .from("domains")
          .select("id, domain_name, status")
          .eq("org_id", userData.org_id);
          
        if (domainsData) {
          setDomains(domainsData);
          if (domainsData.length > 0) setSelectedDomain(domainsData[0].id);
        }

        // Charger les boîtes mail
        const { data: mailboxesData } = await supabase
          .from("mailboxes")
          .select("*")
          .eq("org_id", userData.org_id)
          .order("created_at", { ascending: false });

        if (mailboxesData) setMailboxes(mailboxesData);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setAddError("");

    if (!prefix || !selectedDomain || password.length < 8) {
      setAddError("Veuillez remplir tous les champs (le mot de passe doit faire au moins 8 caractères).");
      setIsAdding(false);
      return;
    }

    const domain = domains.find(d => d.id === selectedDomain);
    const fullAddress = `${prefix.toLowerCase().trim()}@${domain?.domain_name}`;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: userData } = await supabase.from("users").select("org_id").eq("id", user?.id).single();

    // Hachage du mot de passe simulé pour le MVP (dans un vrai système, on utiliserait bcrypt/argon2 côté serveur)
    const mockHash = btoa(password); 

    const { error } = await supabase.from("mailboxes").insert([
      {
        org_id: userData?.org_id,
        domain_id: selectedDomain,
        address: fullAddress,
        password_hash: mockHash,
        quota_mb: 5120, // 5 Go par défaut
        usage_mb: 0,
        status: "ACTIVE"
      }
    ]);

    if (error) {
      if (error.code === '23505') {
        setAddError(`L'adresse ${fullAddress} existe déjà.`);
      } else {
        setAddError("Une erreur s'est produite lors de la création.");
      }
    } else {
      setPrefix("");
      setPassword("");
      setShowForm(false);
      loadData();
    }
    
    setIsAdding(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Boîtes e-mail</h1>
          <p className="text-slate-500">Créez et gérez les adresses de votre organisation.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {showForm ? "Annuler" : <><Plus className="h-4 w-4 mr-2" /> Créer une adresse</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Nouvelle adresse e-mail</h2>
          
          {domains.length === 0 ? (
            <div className="p-4 bg-orange-50 text-orange-700 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
              <p>Vous devez d'abord ajouter un nom de domaine avant de créer des boîtes e-mail.</p>
            </div>
          ) : (
            <form onSubmit={handleCreateMailbox} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Adresse e-mail</label>
                  <div className="flex">
                    <input
                      type="text"
                      required
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      placeholder="prenom.nom"
                      className="w-full px-3 py-2 border border-slate-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="bg-slate-50 border-y border-r border-slate-300 rounded-r-lg px-3 py-2 text-slate-500 flex items-center">
                      @
                      <select 
                        value={selectedDomain}
                        onChange={(e) => setSelectedDomain(e.target.value)}
                        className="bg-transparent border-none ml-1 focus:ring-0 text-slate-700 p-0 font-medium"
                      >
                        {domains.map(d => (
                          <option key={d.id} value={d.id}>{d.domain_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isAdding}
                  className="inline-flex justify-center items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {isAdding ? <Loader2 className="h-5 w-5 animate-spin" /> : "Créer la boîte mail"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Liste des boîtes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher une adresse..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            {mailboxes.length} boîte(s) créée(s)
          </div>
        </div>

        {mailboxes.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Aucune boîte e-mail</h3>
            <p className="text-slate-500 mt-1">Créez votre première adresse professionnelle.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4 font-medium">Adresse & Statut</th>
                  <th className="px-6 py-4 font-medium">Utilisation</th>
                  <th className="px-6 py-4 font-medium hidden md:table-cell">Sécurité</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mailboxes.map((mailbox) => (
                  <tr key={mailbox.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${mailbox.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                          <span className="font-bold text-sm uppercase">{mailbox.address.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{mailbox.address}</p>
                          <div className="flex items-center mt-0.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              mailbox.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {mailbox.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center mb-1">
                        <HardDrive className="h-4 w-4 text-slate-400 mr-2" />
                        <span className="text-sm font-medium text-slate-700">
                          {(mailbox.usage_mb / 1024).toFixed(2)} Go <span className="text-slate-400 font-normal">/ {(mailbox.quota_mb / 1024).toFixed(2)} Go</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[120px]">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full" 
                          style={{ width: `${(mailbox.usage_mb / mailbox.quota_mb) * 100}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex items-center text-sm text-slate-600">
                        <Shield className="h-4 w-4 text-green-500 mr-1.5" />
                        Sécurisé
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
