import Link from 'next/link';
import { Mail, Shield, Zap, Globe, Lock, Smartphone } from 'lucide-react';

export default function FonctionnalitesPage() {
  const features = [
    {
      icon: <Globe className="h-6 w-6 text-blue-600" />,
      title: "Nom de domaine personnalisé",
      description: "Associez votre propre nom de domaine (ex: contact@votre-entreprise.com) en quelques clics grâce à notre configuration DNS simplifiée."
    },
    {
      icon: <Mail className="h-6 w-6 text-blue-600" />,
      title: "Webmail Premium",
      description: "Une interface web moderne, rapide et épurée pour lire et envoyer vos e-mails. Disponible sur ordinateur, tablette et smartphone."
    },
    {
      icon: <Shield className="h-6 w-6 text-blue-600" />,
      title: "Sécurité et Antispam",
      description: "Vos e-mails sont protégés par des filtres anti-spam avancés et des protocoles de sécurité standards de l'industrie (SPF, DKIM, DMARC)."
    },
    {
      icon: <Lock className="h-6 w-6 text-blue-600" />,
      title: "Confidentialité garantie",
      description: "Contrairement aux géants du web, nous ne scannons pas vos e-mails pour afficher des publicités. Vos données vous appartiennent à 100%."
    },
    {
      icon: <Zap className="h-6 w-6 text-blue-600" />,
      title: "Infrastructure Haute Performance",
      description: "Hébergé sur des serveurs haute disponibilité pour garantir que vos e-mails arrivent toujours à destination instantanément."
    },
    {
      icon: <Smartphone className="h-6 w-6 text-blue-600" />,
      title: "Synchronisation Universelle (IMAP/SMTP)",
      description: "Configurez facilement vos adresses sur Outlook, Apple Mail, Thunderbird ou votre smartphone (iOS/Android)."
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

      <main className="flex-1 bg-white py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm mb-3">Fonctionnalités</h2>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Tout ce dont vous avez besoin pour communiquer.
            </h1>
            <p className="mt-4 text-lg text-slate-500">
              Découvrez les outils inclus dans notre plateforme pour propulser l'image professionnelle de votre entreprise.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center bg-blue-600 rounded-3xl p-10 max-w-4xl mx-auto shadow-xl">
            <h2 className="text-3xl font-bold text-white mb-4">Prêt à professionnaliser vos e-mails ?</h2>
            <p className="text-blue-100 mb-8 max-w-xl mx-auto">
              Rejoignez des dizaines d'entreprises qui font confiance à ITA MAIL pour leur communication quotidienne.
            </p>
            <Link 
              href="/register" 
              className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-blue-600 font-bold rounded-full hover:bg-slate-50 transition-colors"
            >
              Créer mon compte
            </Link>
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
