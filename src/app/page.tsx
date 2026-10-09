import Link from 'next/link';
import { Mail, Shield, Zap, Globe, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
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

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 bg-slate-50">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <div className="max-w-3xl mx-auto space-y-6">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-slate-900">
                Votre adresse professionnelle, <span className="text-blue-600">simplement.</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-slate-600 md:text-xl leading-relaxed">
                Créez votre adresse e-mail professionnelle en quelques minutes. 
                Gérez vos boîtes mail, vos domaines et vos utilisateurs depuis une interface moderne conçue pour les PME.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-blue-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-700"
                >
                  Commencer gratuitement <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/tarifs"
                  className="inline-flex h-12 items-center justify-center rounded-md border border-slate-200 bg-white px-8 text-sm font-medium shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                >
                  Voir les tarifs
                </Link>
              </div>
            </div>

            <div className="mt-16 mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="text-blue-600 bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Exemples d'adresses</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-2" /> contact@entreprise.bj</li>
                  <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-2" /> direction@entreprise.bj</li>
                  <li className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-2" /> prenom.nom@entreprise.bj</li>
                </ul>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="text-blue-600 bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Sécurité maximale</h3>
                <p className="text-sm text-slate-600">
                  Protocoles IMAP/SMTP sécurisés, certificats SSL, et protection SPF/DKIM/DMARC incluse.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="text-blue-600 bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Domaines personnalisés</h3>
                <p className="text-sm text-slate-600">
                  Connectez votre propre nom de domaine en quelques clics grâce à notre assistant DNS intégré.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t bg-white py-12">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Mail className="h-5 w-5 text-blue-600" />
            ITA MAIL par ITA INNOVATE
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} ITA INNOVATE. Tous droits réservés.
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
