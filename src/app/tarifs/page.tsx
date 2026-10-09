import Link from 'next/link';
import { Mail, CheckCircle2 } from 'lucide-react';

export default function TarifsPage() {
  const plans = [
    {
      name: "STARTER",
      price: "5 000",
      description: "L'essentiel pour démarrer votre activité en ligne.",
      features: ["3 boîtes e-mail", "5 Go de stockage par boîte", "Webmail Premium", "IMAP/SMTP", "Certificat SSL", "Support standard"],
      popular: false,
    },
    {
      name: "BUSINESS",
      price: "15 000",
      description: "Pour les entreprises en croissance nécessitant plus d'espace.",
      features: ["10 boîtes e-mail", "10 Go de stockage par boîte", "Webmail Premium", "Filtre anti-spam avancé", "SPF/DKIM/DMARC", "Support prioritaire"],
      popular: true,
    },
    {
      name: "PRO",
      price: "35 000",
      description: "Une solution complète pour les équipes structurées.",
      features: ["25 boîtes e-mail", "25 Go de stockage par boîte", "Alias illimités", "Groupes d'e-mails", "Sécurité renforcée", "Support prioritaire 24/7"],
      popular: false,
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 lg:px-14 h-20 flex items-center border-b bg-white">
        <Link className="flex items-center justify-center" href="/">
          <Mail className="h-6 w-6 text-blue-600" />
          <span className="ml-2 text-xl font-bold text-slate-900">ITA MAIL</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:text-blue-600 transition-colors" href="/fonctionnalites">
            Fonctionnalités
          </Link>
          <Link className="text-sm font-medium hover:text-blue-600 transition-colors" href="/tarifs">
            Tarifs
          </Link>
          <Link className="text-sm font-medium hover:text-blue-600 transition-colors hidden sm:block" href="/comment-ca-marche">
            Comment ça marche
          </Link>
          <Link className="text-sm font-medium hover:text-blue-600 transition-colors" href="/login">
            Connexion
          </Link>
          <Link
            className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            href="/register"
          >
            S'inscrire
          </Link>
        </nav>
      </header>

      <main className="flex-1 bg-slate-50 py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Des tarifs simples et transparents
            </h1>
            <p className="mt-4 text-lg text-slate-500">
              Choisissez l'offre qui correspond à la taille de votre entreprise. 
              Pas de frais cachés, annulez quand vous voulez.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div 
                key={plan.name} 
                className={`relative flex flex-col p-8 rounded-2xl bg-white border ${plan.popular ? 'border-blue-600 shadow-xl scale-105 z-10' : 'border-slate-200 shadow-sm'} transition-transform`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                      Le plus populaire
                    </span>
                  </div>
                )}
                
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <p className="text-slate-500 text-sm mt-2 h-10">{plan.description}</p>
                
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                  <span className="text-slate-500 font-medium ml-2">FCFA / mois</span>
                </div>
                
                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-3 shrink-0" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link 
                  href="/register" 
                  className={`w-full py-3 px-6 rounded-lg text-center font-semibold transition-colors ${
                    plan.popular 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  }`}
                >
                  Choisir ce plan
                </Link>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="w-full py-6 bg-slate-50 border-t">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Mail className="h-5 w-5 text-blue-600" />
            ITA MAIL par ITA INNOVATE
          </div>
          <p className="text-sm text-slate-500">
            © 2026 ITA INNOVATE. Tous droits réservés.
          </p>
          <div className="flex gap-4">
            <Link className="text-sm text-slate-500 hover:text-slate-900" href="#">Mentions légales</Link>
            <Link className="text-sm text-slate-500 hover:text-slate-900" href="#">Confidentialité</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
