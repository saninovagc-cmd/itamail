"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Plus, Search, Shield, User, Loader2, MoreVertical, Mail } from "lucide-react";

type OrgUser = {
  id: string;
  full_name: string;
  email: string;
  role: "ORG_ADMIN" | "USER";
  created_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États pour l'invitation
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"ORG_ADMIN" | "USER">("USER");
  const [inviteMessage, setInviteMessage] = useState({ type: "", text: "" });

  const supabase = createClient();

  const loadUsers = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (userData?.org_id) {
        const { data: orgUsers } = await supabase
          .from("users")
          .select("*")
          .eq("org_id", userData.org_id)
          .order("created_at", { ascending: true });

        if (orgUsers) setUsers(orgUsers as OrgUser[]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteMessage({ type: "", text: "" });

    // Pour le MVP, on simule l'invitation avec un délai.
    // Dans une version complète, on utiliserait supabase.auth.admin.inviteUserByEmail (nécessite le service role key côté serveur)
    // ou une API personnalisée.
    
    setTimeout(() => {
      setInviteMessage({ 
        type: "success", 
        text: `Une invitation a été envoyée à ${inviteEmail}. L'utilisateur rejoindra votre équipe après inscription.` 
      });
      setInviteEmail("");
      setInviteName("");
      setInviteRole("USER");
      setIsInviting(false);
    }, 1500);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Utilisateurs et Rôles</h1>
          <p className="text-slate-500">Gérez les membres qui ont accès à cet espace d'administration.</p>
        </div>
        <button 
          onClick={() => {
            setShowInviteForm(!showInviteForm);
            setInviteMessage({ type: "", text: "" });
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {showInviteForm ? "Annuler" : <><Plus className="h-4 w-4 mr-2" /> Inviter un membre</>}
        </button>
      </div>

      {showInviteForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Inviter un nouveau membre</h2>
          <p className="text-sm text-slate-500 mb-6">Le membre recevra un lien par e-mail pour rejoindre votre organisation.</p>
          
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ex: Alice Durand"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adresse e-mail</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="alice@exemple.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "ORG_ADMIN" | "USER")}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="USER">Utilisateur simple (accès Webmail)</option>
                  <option value="ORG_ADMIN">Administrateur (Dashboard)</option>
                </select>
              </div>
            </div>
            
            {inviteMessage.text && (
              <div className={`p-3 rounded-lg text-sm font-medium ${inviteMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {inviteMessage.text}
              </div>
            )}
            
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isInviting}
                className="inline-flex justify-center items-center px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 font-medium"
              >
                {isInviting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Envoyer l'invitation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher un membre..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            {users.length} membre(s) actif(s)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-4 font-medium">Membre</th>
                <th className="px-6 py-4 font-medium">Rôle</th>
                <th className="px-6 py-4 font-medium hidden md:table-cell">Statut</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-4 flex-shrink-0 font-bold">
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{u.full_name}</p>
                        <p className="text-sm text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {u.role === 'ORG_ADMIN' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Shield className="h-3.5 w-3.5 mr-1.5" /> Administrateur
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <User className="h-3.5 w-3.5 mr-1.5" /> Utilisateur
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex items-center text-sm">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500 mr-2"></span>
                      Actif
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
      </div>
    </div>
  );
}
