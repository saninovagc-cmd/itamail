import Link from 'next/link';
import { Mail, UserPlus, Globe, CheckCircle2 } from 'lucide-react';

export default function CommentCaMarchePage() {
  const steps = [
    {
      icon: <UserPlus className="h-8 w-8 text-white" />,
      title: "1. Créez votre organisation",
      description: "Inscrivez-vous sur la plateforme et choisissez le forfait qui correspond aux besoins de votre entreprise. La création de compte prend moins d'une minute."
    },
    {
      icon: <Globe className="h-8 w-8 text-white" />,
      title: "2. Liez votre nom de domaine",
      description: "Ajoutez votre domaine existant. Nous vous donnerons quelques enregistrements DNS (TXT, MX) à copier-coller chez votre hébergeur pour prouver que vous en êtes propriétaire."
    },
    {
      icon: <CheckCircle2 className="h-8 w-8 text-white" />,
      title: "3. Créez vos boîtes mail",
      description: "Une fois le domaine vérifié, commencez à créer des adresses (ex: contact@, prenom@). Vos collaborateurs pourront immédiatement se connecter au Webmail."
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
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Votre messagerie pro en 3 étapes
            </h1>
            <p className="mt-4 text-lg text-slate-500">
              Pas besoin d'être un expert en informatique. Notre processus est simple, guidé et rapide.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-12">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col md:flex-row items-center gap-8 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <div className="shrink-0 h-20 w-20 bg-blue-600 rounded-2xl shadow-lg flex items-center justify-center">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-lg text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-16 text-center">
              <Link 
                href="/register" 
                className="inline-flex items-center justify-center px-8 py-3.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Commencer maintenant
              </Link>
            </div>
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
