"use client";

import { useState, useEffect } from "react";
import { 
  Settings, 
  Save, 
  Check, 
  Type, 
  Palette, 
  FileSignature, 
  Mail, 
  Sliders, 
  Sparkles,
  RotateCcw
} from "lucide-react";

export interface MailSettings {
  signature: string;
  fontFamily: string;
  fontSize: string;
  textColor: string;
  replyPrefix: string;
  autoSaveDrafts: boolean;
  notifyOnSent: boolean;
}

export const DEFAULT_MAIL_SETTINGS: MailSettings = {
  signature: "--\nCordialement,\nEnvoyé avec ITA MAIL",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: "14px",
  textColor: "#1e293b",
  replyPrefix: "Re: ",
  autoSaveDrafts: true,
  notifyOnSent: true,
};

export const AVAILABLE_FONTS = [
  { label: "Système / Moderne (Inter / Sans)", value: "Inter, system-ui, -apple-system, sans-serif" },
  { label: "Arial / Helvetica", value: "Arial, Helvetica, sans-serif" },
  { label: "Georgia (Élégant / Avec empattement)", value: "Georgia, Cambria, serif" },
  { label: "Times New Roman (Formel)", value: "'Times New Roman', Times, serif" },
  { label: "Courier New (Monospace / Code)", value: "'Courier New', Courier, monospace" },
  { label: "Verdana (Lisibilité maximale)", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
];

export const AVAILABLE_FONT_SIZES = [
  { label: "Très petite (12px)", value: "12px" },
  { label: "Normale (14px)", value: "14px" },
  { label: "Moyenne (16px)", value: "16px" },
  { label: "Grande (18px)", value: "18px" },
  { label: "Très grande (20px)", value: "20px" },
];

export const AVAILABLE_COLORS = [
  { label: "Anthracite (Défaut)", value: "#1e293b" },
  { label: "Noir pur", value: "#000000" },
  { label: "Bleu Nuit Professionnel", value: "#1e40af" },
  { label: "Bleu Indigo Moderne", value: "#4338ca" },
  { label: "Gris Foncé Neutre", value: "#475569" },
  { label: "Vert Forêt Élégant", value: "#166534" },
  { label: "Bordeaux / Pourpre", value: "#881337" },
];

export function getMailSettings(userEmail?: string | null): MailSettings {
  if (typeof window === "undefined") return DEFAULT_MAIL_SETTINGS;
  try {
    const key = userEmail ? `ita_mail_settings_${userEmail}` : "ita_mail_settings_global";
    const raw = localStorage.getItem(key) || localStorage.getItem("ita_mail_settings_global");
    if (!raw) return DEFAULT_MAIL_SETTINGS;
    return { ...DEFAULT_MAIL_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_MAIL_SETTINGS;
  }
}

export function saveMailSettingsToStorage(settings: MailSettings, userEmail?: string | null) {
  if (typeof window === "undefined") return;
  const key = userEmail ? `ita_mail_settings_${userEmail}` : "ita_mail_settings_global";
  localStorage.setItem(key, JSON.stringify(settings));
  localStorage.setItem("ita_mail_settings_global", JSON.stringify(settings));
}

export default function ParametresPage() {
  const [settings, setSettings] = useState<MailSettings>(DEFAULT_MAIL_SETTINGS);
  const [userEmail, setUserEmail] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem("webmail_user") || "utilisateur@organisation.com";
    setUserEmail(email);
    const loaded = getMailSettings(email);
    setSettings(loaded);
  }, []);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveMailSettingsToStorage(settings, userEmail);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleReset = () => {
    if (confirm("Réinitialiser tous les paramètres d'affichage et de signature aux valeurs par défaut ?")) {
      setSettings(DEFAULT_MAIL_SETTINGS);
      saveMailSettingsToStorage(DEFAULT_MAIL_SETTINGS, userEmail);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-200">
      {/* Entête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-blue-600" />
            Paramètres du Webmail
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Personnalisez votre signature d'e-mail, vos polices d'écriture, vos couleurs et vos préférences d'envoi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Par défaut
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2"
          >
            {savedSuccess ? (
              <>
                <Check className="h-4 w-4 text-emerald-300" />
                Enregistré !
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Colonne de gauche: Formulaires */}
        <div className="md:col-span-2 space-y-6">
          {/* Section 1: Signature d'e-mail */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <FileSignature className="h-5 w-5 text-blue-600" />
              <h2>Signature d'e-mail</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cette signature sera automatiquement intégrée à la fin de vos nouveaux messages et réponses rédigés.
            </p>
            <textarea
              value={settings.signature}
              onChange={(e) => setSettings({ ...settings, signature: e.target.value })}
              rows={4}
              placeholder="Ex: Cordialement, Jean Dupont - Directeur Commercial..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y font-mono"
            />
          </div>

          {/* Section 2: Typographie & Couleurs */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Type className="h-5 w-5 text-blue-600" />
              <h2>Police & Style d'écriture par défaut</h2>
            </div>
            <p className="text-xs text-slate-500">
              Définissez la typographie appliquée à la rédaction et à l'affichage de vos e-mails.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Famille de police
                </label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {AVAILABLE_FONTS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Taille du texte
                </label>
                <select
                  value={settings.fontSize}
                  onChange={(e) => setSettings({ ...settings, fontSize: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {AVAILABLE_FONT_SIZES.map((sz) => (
                    <option key={sz.value} value={sz.value}>
                      {sz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sélecteur de couleur */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <Palette className="h-4 w-4 text-slate-500" />
                Couleur de texte préférée
              </label>
              <div className="flex flex-wrap gap-2.5 items-center">
                {AVAILABLE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSettings({ ...settings, textColor: c.value })}
                    className={`h-8 w-8 rounded-full border-2 transition-transform flex items-center justify-center ${
                      settings.textColor === c.value ? "scale-110 border-blue-600 shadow-md" : "border-white hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  >
                    {settings.textColor === c.value && (
                      <Check className="h-4 w-4 text-white drop-shadow" />
                    )}
                  </button>
                ))}
                <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200">
                  <input
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                    className="h-8 w-8 rounded-lg cursor-pointer border border-slate-200 bg-transparent p-0.5"
                    title="Choisir une couleur personnalisée"
                  />
                  <span className="text-xs font-mono text-slate-500">{settings.textColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Spécificités & Options d'envoi */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <Sliders className="h-5 w-5 text-blue-600" />
              <h2>Spécificités et Comportements</h2>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.autoSaveDrafts}
                  onChange={(e) => setSettings({ ...settings, autoSaveDrafts: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Sauvegarde automatique des brouillons</p>
                  <p className="text-[11px] text-slate-500">
                    Enregistre automatiquement votre progression lors de la fermeture d'un message en cours de saisie.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.notifyOnSent}
                  onChange={(e) => setSettings({ ...settings, notifyOnSent: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Notifications d'envoi réussi</p>
                  <p className="text-[11px] text-slate-500">
                    Affiche une confirmation visuelle dès qu'un message est acheminé avec succès.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Colonne de droite: Aperçu en direct */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm sticky top-6">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h3>Aperçu en direct de votre message</h3>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="border-b border-slate-200 pb-2 text-xs text-slate-500">
                <p><strong>De:</strong> {userEmail || "moi@organisation.com"}</p>
                <p><strong>Objet:</strong> Exemple de rendu de vos réglages</p>
              </div>

              {/* Rendu du texte selon les styles choisis */}
              <div
                style={{
                  fontFamily: settings.fontFamily,
                  fontSize: settings.fontSize,
                  color: settings.textColor,
                  lineHeight: "1.6",
                }}
                className="min-h-[140px] whitespace-pre-wrap break-words"
              >
                Bonjour,<br /><br />
                Voici comment apparaîtront vos correspondances, citations et réponses avec vos paramètres actuels de police, taille et couleur.<br /><br />
                {settings.signature}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 text-center">
              Ces styles s'appliquent en direct lors de la rédaction et de la mise en page de vos mails.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
