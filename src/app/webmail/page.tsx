"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Inbox, 
  Send, 
  FileText, 
  Trash2, 
  Search, 
  PenSquare,
  Star,
  Archive,
  MoreVertical,
  Reply,
  Forward,
  LogOut,
  Mail,
  MoreHorizontal,
  CheckCircle,
  Paperclip,
  Folder,
  AlertOctagon
} from "lucide-react";

// Données simulées pour le MVP
const MOCK_EMAILS = [
  {
    id: 1,
    sender: "Équipe ITA INNOVATE",
    email: "support@itainnovate.com",
    subject: "Bienvenue sur votre nouvelle boîte mail !",
    preview: "Nous sommes ravis de vous compter parmi nous. Voici quelques conseils pour...",
    date: "10:30",
    read: false,
    folder: "inbox",
    body: "Bonjour,\n\nNous sommes ravis de vous compter parmi nous sur ITA MAIL. Votre boîte est maintenant prête à être utilisée avec sa configuration optimale.\n\nVous pouvez configurer cette adresse sur votre téléphone (iOS/Android) ou Outlook en utilisant les paramètres IMAP/SMTP fournis dans votre tableau de bord.\n\nN'hésitez pas à nous contacter si vous avez la moindre question.\n\nCordialement,\nL'équipe technique ITA INNOVATE."
  },
  {
    id: 2,
    sender: "Jean Dupont",
    email: "jean.dupont@client.com",
    subject: "Demande de devis - Projet Web E-commerce",
    preview: "Bonjour, Suite à notre échange téléphonique d'hier, je vous contacte pour...",
    date: "Hier",
    read: true,
    folder: "inbox",
    body: "Bonjour,\n\nSuite à notre échange téléphonique d'hier, je vous contacte pour obtenir un devis détaillé concernant la création de notre site e-commerce.\n\nIdéalement, nous aimerions intégrer un module de paiement local. Pouvons-nous prévoir une réunion mardi prochain pour en discuter ?\n\nMerci d'avance pour votre retour.\n\nJean."
  }
];

export default function WebmailPage() {
  const [emails, setEmails] = useState(MOCK_EMAILS);
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [selectedEmail, setSelectedEmail] = useState<typeof MOCK_EMAILS[0] | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // States rédaction
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // States du formulaire
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  useEffect(() => {
    setIsClient(true);
    const savedEmail = localStorage.getItem("webmail_user");
    if (!savedEmail) {
      window.location.href = "/webmail/login";
    } else {
      setUserEmail(savedEmail);
      setSelectedEmail(MOCK_EMAILS[0]);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("webmail_user");
    window.location.href = "/webmail/login";
  };

  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      alert("Veuillez remplir les champs À, Objet et Message.");
      return;
    }
    
    setIsSending(true);
    
    try {
      const response = await fetch('/api/webmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: userEmail,
          to: composeTo,
          cc: showCcBcc ? composeCc : undefined,
          bcc: showCcBcc ? composeBcc : undefined,
          subject: composeSubject,
          text: composeBody
        })
      });

      if (!response.ok) {
        throw new Error("Erreur d'envoi");
      }
      
      // Ajouter l'e-mail envoyé dans l'interface (dossier 'sent')
      setEmails(prev => [{
        id: Date.now(),
        sender: "Moi",
        email: userEmail || "",
        to: composeTo,
        subject: composeSubject,
        preview: composeBody.substring(0, 50) + "...",
        date: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}),
        read: true,
        folder: "sent",
        body: composeBody
      }, ...prev]);

      setSentSuccess(true);
      setTimeout(() => {
        setIsComposing(false);
        setSentSuccess(false);
        setShowCcBcc(false);
        // Réinitialiser le formulaire
        setComposeTo(""); setComposeCc(""); setComposeBcc("");
        setComposeSubject(""); setComposeBody("");
      }, 2500);
    } catch (error) {
      console.error(error);
      alert("Une erreur est survenue lors de l'envoi.");
    } finally {
      setIsSending(false);
    }
  };

  const filteredEmails = emails.filter(e => 
    e.folder === activeFolder && 
    (e.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
     e.sender.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isClient || !userEmail) return null;

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900">
      
      {/* HEADER PREMIUM */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-3 w-64">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
            <Mail className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">ITA Webmail</span>
        </div>
        
        <div className="flex-1 max-w-2xl mx-8">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Rechercher un message, un contact..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100/70 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 rounded-full text-sm transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">{userEmail}</p>
            <p className="text-xs font-medium text-emerald-500 flex items-center justify-end">
              Connecté
            </p>
          </div>
          <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer shadow-md ring-2 ring-white hover:scale-105 transition-transform">
            {userEmail.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR */}
        <div className="w-64 bg-white/50 backdrop-blur-sm border-r border-slate-200/60 flex flex-col p-4 z-10">
          <button 
            onClick={() => setIsComposing(true)}
            className="w-full group flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-md shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-[0.98] mb-8"
          >
            <PenSquare className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            Nouveau message
          </button>

          <nav className="flex-1 space-y-1.5">
            {[
              { id: 'inbox', label: 'Boîte de réception', icon: Inbox, count: 1 },
              { id: 'sent', label: 'Envoyés', icon: Send },
              { id: 'drafts', label: 'Brouillons', icon: FileText },
              { id: 'spams', label: 'Spams', icon: AlertOctagon },
              { id: 'trash', label: 'Corbeille', icon: Trash2 },
              { id: 'folders', label: 'Dossiers', icon: Folder }
            ].map(folder => (
              <button 
                key={folder.id}
                onClick={() => {setActiveFolder(folder.id); setSelectedEmail(null);}}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeFolder === folder.id 
                  ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100/50' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center">
                  <folder.icon className={`h-4 w-4 mr-3 ${activeFolder === folder.id ? 'text-blue-600' : 'text-slate-400'}`} /> 
                  {folder.label}
                </div>
                {folder.count && (
                  <span className={`text-xs py-0.5 px-2 rounded-full ${activeFolder === folder.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {folder.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-200/60">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-slate-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" /> Déconnexion
            </button>
          </div>
        </div>

        {/* LISTE DES MAILS */}
        <div className="w-[380px] bg-white border-r border-slate-200/60 flex flex-col flex-shrink-0 relative z-0">
          <div className="px-5 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-800 capitalize tracking-tight">
              {activeFolder === 'inbox' ? 'Boîte de réception' : 
               activeFolder === 'sent' ? 'Envoyés' : 
               activeFolder === 'drafts' ? 'Brouillons' : 
               activeFolder === 'spams' ? 'Spams' : 
               activeFolder === 'folders' ? 'Dossiers' : 
               'Corbeille'}
            </h2>
            <button className="text-slate-400 hover:text-slate-700 transition-colors">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
          
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Inbox className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">Aucun message</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredEmails.map(email => (
                  <div 
                    key={email.id} 
                    onClick={() => setSelectedEmail(email)}
                    className={`p-4 cursor-pointer transition-all duration-200 relative ${
                      selectedEmail?.id === email.id 
                        ? 'bg-blue-50/50 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-blue-500' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className={`text-sm truncate pr-2 ${!email.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {activeFolder === 'sent' ? `À : ${(email as any).to}` : email.sender}
                      </h3>
                      <span className={`text-[11px] font-medium flex-shrink-0 ${!email.read ? 'text-blue-600' : 'text-slate-400'}`}>
                        {email.date}
                      </span>
                    </div>
                    <h4 className={`text-sm truncate mb-1.5 ${!email.read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                      {email.subject}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{email.preview}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* LECTURE DU MAIL */}
        <div className="flex-1 bg-white flex flex-col relative">
          {selectedEmail ? (
            <>
              {/* Toolbar */}
              <div className="h-14 border-b border-slate-200/60 flex items-center px-6 gap-1 bg-white/95 backdrop-blur-sm">
                <button className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors tooltip" title="Archiver">
                  <Archive className="h-4 w-4" />
                </button>
                <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip" title="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-2"></div>
                <button className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors tooltip" title="Important">
                  <Star className="h-4 w-4" />
                </button>
                <div className="flex-1"></div>
                <button className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              {/* Contenu */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto p-8 lg:p-12">
                  <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-8 tracking-tight">{selectedEmail.subject}</h1>
                  
                  <div className="flex items-start justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center font-bold text-lg text-slate-600 shadow-sm">
                        {selectedEmail.sender.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <p className="font-bold text-slate-900">{selectedEmail.sender}</p>
                          <p className="text-sm text-slate-500">&lt;{selectedEmail.email}&gt;</p>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                          À : {(selectedEmail as any).to || userEmail}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                      {selectedEmail.date}
                    </div>
                  </div>

                  <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap text-[15px]">
                    {selectedEmail.body}
                  </div>

                  {/* Actions Rapides */}
                  <div className="mt-12 pt-8 border-t border-slate-100 flex gap-3">
                    <button className="flex items-center px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm">
                      <Reply className="h-4 w-4 mr-2 text-slate-400" /> Répondre
                    </button>
                    <button className="flex items-center px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm">
                      <Forward className="h-4 w-4 mr-2 text-slate-400" /> Transférer
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
              <div className="h-20 w-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-5">
                <Mail className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Aucun message sélectionné</h3>
              <p className="text-slate-500 text-sm mt-1">Sélectionnez un e-mail dans la liste pour le lire.</p>
            </div>
          )}
        </div>
      </div>

      {/* COMPOSER (OVERLAY) */}
      {isComposing && (
        <div className="fixed inset-0 z-50 flex items-end justify-end sm:p-6 sm:pr-8 pointer-events-none">
          <div className="pointer-events-auto w-full sm:w-[600px] h-full sm:h-[600px] bg-white sm:rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300 ease-out">
            
            {/* Composer Header */}
            <div className="bg-slate-900 text-white px-5 py-3 flex justify-between items-center">
              <span className="font-semibold text-sm tracking-wide">Nouveau message</span>
              <button 
                onClick={() => { setIsComposing(false); setSentSuccess(false); setShowCcBcc(false); }} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                &times;
              </button>
            </div>
            
            {sentSuccess ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-white">
                <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mb-5 border-4 border-emerald-100/50 animate-in zoom-in duration-300">
                  <CheckCircle className="h-10 w-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Message envoyé !</h3>
                <p className="text-slate-500 text-sm">Votre communication est en route.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col flex-1 overflow-y-auto">
                  <div className="flex px-5 py-3 border-b border-slate-100 items-center focus-within:bg-blue-50/30 transition-colors">
                    <span className="text-sm font-medium text-slate-500 mr-2 w-8">À</span>
                    <input 
                      type="text" 
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      placeholder="destinataires, séparés par des virgules" 
                      className="flex-1 focus:outline-none text-sm bg-transparent placeholder-slate-300" 
                    />
                    <button 
                      onClick={() => setShowCcBcc(!showCcBcc)} 
                      className="text-xs font-semibold text-slate-400 hover:text-blue-600 ml-2 uppercase tracking-wider"
                    >
                      Cc/Cci
                    </button>
                  </div>
                  
                  {showCcBcc && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <div className="flex px-5 py-3 border-b border-slate-100 items-center bg-slate-50/50 focus-within:bg-blue-50/30 transition-colors">
                        <span className="text-sm font-medium text-slate-500 mr-2 w-8">Cc</span>
                        <input 
                          type="text" 
                          value={composeCc}
                          onChange={(e) => setComposeCc(e.target.value)}
                          placeholder="Ajouter des destinataires en copie" 
                          className="flex-1 focus:outline-none text-sm bg-transparent" 
                        />
                      </div>
                      <div className="flex px-5 py-3 border-b border-slate-100 items-center bg-slate-50/50 focus-within:bg-blue-50/30 transition-colors">
                        <span className="text-sm font-medium text-slate-500 mr-2 w-8">Cci</span>
                        <input 
                          type="text" 
                          value={composeBcc}
                          onChange={(e) => setComposeBcc(e.target.value)}
                          placeholder="Ajouter des destinataires en copie cachée" 
                          className="flex-1 focus:outline-none text-sm bg-transparent" 
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex px-5 py-3 border-b border-slate-100 items-center focus-within:bg-blue-50/30 transition-colors">
                    <input 
                      type="text" 
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="Objet" 
                      className="flex-1 focus:outline-none text-sm font-bold placeholder-slate-300 bg-transparent" 
                    />
                  </div>
                  
                  <textarea 
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Saisissez votre message..." 
                    className="flex-1 p-5 focus:outline-none resize-none text-sm text-slate-700 leading-relaxed bg-transparent"
                  ></textarea>
                </div>

                {/* Composer Footer */}
                <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleSendEmail} 
                      disabled={isSending}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center shadow-md shadow-blue-500/20 disabled:opacity-70"
                    >
                      {isSending ? 'Envoi...' : 'Envoyer'} <Send className={`h-4 w-4 ml-2 ${isSending ? 'animate-pulse' : ''}`} />
                    </button>
                    
                    <label className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors" title="Joindre un fichier">
                      <input type="file" multiple className="hidden" />
                      <Paperclip className="h-5 w-5" />
                    </label>
                  </div>
                  
                  <button 
                    onClick={() => { setIsComposing(false); setShowCcBcc(false); }} 
                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                    title="Supprimer le brouillon"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Global CSS for scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
}
