"use client";

import { useState } from 'react';
import Link from 'next/link';
import { 
  Mail, 
  CheckCircle2, 
  Sparkles, 
  CreditCard, 
  Smartphone, 
  ShieldCheck, 
  ArrowRight,
  Calculator,
  Plus,
  Minus
} from 'lucide-react';
import { calculateSubscriptionPrice, formatFCFA, BillingInterval } from '@/lib/pricing';

export default function TarifsPage() {
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [simulatedBoxes, setSimulatedBoxes] = useState<number>(3);

  const calc = calculateSubscriptionPrice(simulatedBoxes, interval);
  const isYearly = interval === 'yearly';

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* HEADER */}
      <header className="px-6 lg:px-14 h-20 flex items-center border-b bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <Link className="flex items-center justify-center" href="/">
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-500/20 mr-2.5">
            <Mail className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold text-slate-900 tracking-tight">ITA MAIL</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:text-blue-600 transition-colors" href="/fonctionnalites">
            Fonctionnalités
          </Link>
          <Link className="text-sm font-semibold text-blue-600" href="/tarifs">
            Tarifs
          </Link>
          <Link className="text-sm font-medium hover:text-blue-600 transition-colors hidden sm:block" href="/comment-ca-marche">
            Comment ça marche
          </Link>
          <Link className="text-sm font-medium hover:text-blue-600 transition-colors" href="/login">
            Connexion
          </Link>
          <Link
            className="text-sm font-semibold bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 hover:shadow-blue-500/30"
            href="/register"
          >
            Commencer
          </Link>
        </nav>
      </header>

      <main className="flex-1 bg-slate-50/60 py-16 lg:py-24">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          
          {/* TITRE PRINCIPAL */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Tarification Transparente & Évolutive
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Payez uniquement ce dont votre entreprise a besoin
            </h1>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              Une formule claire et adaptée à chaque organisation : un tarif de base pour votre premier compte, et un coût réduit pour chaque boîte e-mail supplémentaire.
            </p>

            {/* SÉLECTEUR MENSUEL / ANNUEL */}
            <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300/60 shadow-inner">
              <button
                type="button"
                onClick={() => setInterval('monthly')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  !isYearly
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Facturation Mensuelle
              </button>
              <button
                type="button"
                onClick={() => setInterval('yearly')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  isYearly
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Facturation Annuelle
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  isYearly ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  -20%
                </span>
              </button>
            </div>
          </div>

          {/* SIMULATEUR INTERACTIF EN DIRECT */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden mb-16 max-w-4xl mx-auto">
            <div className="p-8 lg:p-10 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Calculator className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Calculateur d&apos;Abonnement</h2>
                  <p className="text-sm text-slate-500">
                    Ajustez le nombre de comptes e-mails professionnels pour voir votre tarif exact.
                  </p>
                </div>
              </div>

              {/* CONTRÔLE NOMBRE DE BOÎTES */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-slate-700">Nombre de boîtes e-mails :</span>
                    <span className="text-2xl font-extrabold text-blue-600 bg-blue-50 px-4 py-1 rounded-xl">
                      {simulatedBoxes} boîte{simulatedBoxes > 1 ? 's' : ''}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={simulatedBoxes}
                    onChange={(e) => setSimulatedBoxes(parseInt(e.target.value) || 1)}
                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />

                  <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                    <span>1 boîte (Minimum)</span>
                    <span>10 boîtes</span>
                    <span>20 boîtes</span>
                    <span>30+ boîtes</span>
                  </div>
                </div>

                {/* BOUTONS RAPIDES */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-xs font-semibold text-slate-500 mr-2">Sélection rapide :</span>
                  {[1, 3, 5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSimulatedBoxes(num)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        simulatedBoxes === num
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {num} {num === 1 ? 'mail' : 'mails'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RÉCAPITULATIF FINANCIER DU CALCULATEUR */}
            <div className="bg-slate-900 text-white p-8 lg:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-blue-400 font-bold">
                    Total pour votre organisation ({isYearly ? 'Annuel' : 'Mensuel'})
                  </span>
                  {isYearly && calc.savingsVsMonthly > 0 && (
                    <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2.5 py-0.5 rounded-full">
                      Économie : {formatFCFA(calc.savingsVsMonthly)} / an
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl lg:text-5xl font-black text-white tracking-tight">
                    {formatFCFA(calc.totalAmount)}
                  </span>
                  <span className="text-slate-400 font-semibold text-base">
                    / {isYearly ? 'an' : 'mois'}
                  </span>
                </div>

                {/* DÉCOMPTE TRANSPARENT */}
                <p className="text-xs text-slate-400 pt-1">
                  Détail : 1er compte à <span className="text-white font-semibold">{formatFCFA(calc.firstMailboxPrice)}</span>
                  {calc.additionalMailboxesCount > 0 && (
                    <>
                      {' '}+ {calc.additionalMailboxesCount} compte{calc.additionalMailboxesCount > 1 ? 's' : ''} additionnel{calc.additionalMailboxesCount > 1 ? 's' : ''} à <span className="text-white font-semibold">{formatFCFA(calc.additionalMailboxPrice)}</span>/boîte
                    </>
                  )}
                </p>
              </div>

              <Link
                href="/register"
                className="w-full md:w-auto inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-base shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Créer mon organisation
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </div>
          </div>

          {/* DÉTAIL DES DEUX FORMULES CÔTE À CÔTE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            
            {/* CARTE MENSUELLE */}
            <div className={`rounded-3xl p-8 border-2 transition-all flex flex-col justify-between ${
              !isYearly ? 'bg-white border-blue-600 shadow-xl' : 'bg-white border-slate-200'
            }`}>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Formule Mensuelle</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    Sans engagement
                  </span>
                </div>

                <div className="mb-6">
                  <div className="text-3xl font-extrabold text-slate-900">
                    2 500 <span className="text-base font-normal text-slate-500">F CFA / mois</span>
                  </div>
                  <p className="text-xs text-blue-600 font-semibold mt-1">
                    Pour la 1ère boîte mail de l&apos;organisation
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 mb-6">
                  <p className="text-sm font-bold text-slate-800">
                    + 1 250 F CFA <span className="font-normal text-slate-500">/ mois</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Par boîte supplémentaire ajoutée
                  </p>
                </div>

                <ul className="space-y-3 mb-8 text-sm text-slate-600">
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2.5 flex-shrink-0" />
                    Webmail complet & Réactif
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2.5 flex-shrink-0" />
                    Envoi & Réception instantanés (Resend Inbound)
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2.5 flex-shrink-0" />
                    5 Go de stockage sécurisé par utilisateur
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2.5 flex-shrink-0" />
                    Paiement FedaPay (Mobile Money & Carte)
                  </li>
                </ul>
              </div>

              <Link
                href="/register"
                className="w-full py-3 px-6 rounded-xl text-center font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-900 transition-colors"
              >
                Choisir la formule mensuelle
              </Link>
            </div>

            {/* CARTE ANNUELLE */}
            <div className={`rounded-3xl p-8 border-2 transition-all flex flex-col justify-between relative ${
              isYearly ? 'bg-white border-blue-600 shadow-xl' : 'bg-white border-slate-200'
            }`}>
              <div className="absolute top-0 right-8 -translate-y-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider py-1.5 px-4 rounded-full shadow-md">
                  Recommandé (Économique)
                </span>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Formule Annuelle</h3>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    ~2 mois offerts
                  </span>
                </div>

                <div className="mb-6">
                  <div className="text-3xl font-extrabold text-slate-900">
                    25 000 <span className="text-base font-normal text-slate-500">F CFA / an</span>
                  </div>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    Économisez 5 000 F CFA sur la 1ère boîte (au lieu de 30 000 F)
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 mb-6">
                  <p className="text-sm font-bold text-slate-800">
                    + 12 500 F CFA <span className="font-normal text-slate-500">/ an</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Par boîte supplémentaire (au lieu de 15 000 F CFA)
                  </p>
                </div>

                <ul className="space-y-3 mb-8 text-sm text-slate-600">
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2.5 flex-shrink-0" />
                    Toutes les fonctionnalités de la formule mensuelle
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2.5 flex-shrink-0" />
                    Tranquillité d&apos;esprit pendant 1 an complet
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2.5 flex-shrink-0" />
                    Support prioritaire dédié ITA INNOVATE
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2.5 flex-shrink-0" />
                    Paiement FedaPay en un seul règlement
                  </li>
                </ul>
              </div>

              <Link
                href="/register"
                className="w-full py-3 px-6 rounded-xl text-center font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
              >
                Choisir la formule annuelle
              </Link>
            </div>

          </div>

          {/* BANDEAU MOYENS DE PAIEMENT FEDAPAY */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-inner">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Paiements 100% sécurisés par FedaPay</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Réglez instantanément avec vos moyens de paiement favoris en Afrique et à l&apos;international.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['MTN Mobile Money', 'Moov Money', 'Celtiis Cash', 'Orange Money', 'Wave', 'Visa / Mastercard'].map((method) => (
                <span key={method} className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-700">
                  {method}
                </span>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full py-8 bg-white border-t">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left max-w-6xl">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Mail className="h-5 w-5 text-blue-600" />
            ITA MAIL par ITA INNOVATE
          </div>
          <p className="text-sm text-slate-500">
            © 2026 ITA INNOVATE. Tous droits réservés.
          </p>
          <div className="flex gap-4">
            <Link className="text-sm text-slate-500 hover:text-slate-900" href="/faq">FAQ</Link>
            <Link className="text-sm text-slate-500 hover:text-slate-900" href="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
