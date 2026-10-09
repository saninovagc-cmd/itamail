import Link from 'next/link';
import { Mail, HelpCircle, ChevronDown } from 'lucide-react';

export default function FAQPage() {
  const faqs = [
    {
      q: "Ai-je besoin de compétences techniques pour utiliser ITA MAIL ?",
      a: "Non, notre plateforme a été conçue pour être la plus simple possible. La configuration de votre nom de domaine vous est guidée étape par étape."
    },
    {
      q: "Est-ce que je peux utiliser mon nom de domaine existant ?",
      a: "Absolument. Si vous possédez déjà un nom de domaine chez un registrar (GoDaddy, LWS, OVH...), il vous suffira d'ajouter quelques enregistrements DNS que nous vous fournirons pour le lier à nos serveurs e-mail."
    },
    {
      q: "Puis-je lire mes e-mails sur mon téléphone ?",
      a: "Oui ! Vous pouvez utiliser notre Webmail Premium depuis le navigateur de votre téléphone, ou configurer votre adresse sur n'importe quelle application (Apple Mail, Gmail, Outlook) via les protocoles IMAP et SMTP standards."
    },
    {
      q: "Comment fonctionne la facturation ?",
      a: "La facturation est mensuelle, sans engagement de durée. Vous pouvez upgrader, downgrader ou annuler votre abonnement à tout moment depuis votre tableau de bord."
    },
    {
      q: "Que se passe-t-il si je dépasse mon quota de stockage ?",
      a: "Vous recevrez des alertes par e-mail à l'approche de votre limite (80% et 95%). Si vous dépassez la limite, vous ne pourrez temporairement plus recevoir de nouveaux messages jusqu'à ce que vous libériez de l'espace ou passiez au forfait supérieur."
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
              Foire Aux Questions
            </h1>
            <p className="mt-4 text-lg text-slate-500">
              Vous avez des questions ? Nous avons les réponses.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 flex items-start gap-3">
                  <HelpCircle className="h-6 w-6 text-blue-600 shrink-0" />
                  {faq.q}
                </h3>
                <p className="mt-3 text-slate-600 ml-9 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <p className="text-slate-600 mb-4">Vous n'avez pas trouvé de réponse à votre question ?</p>
            <Link href="/register" className="font-semibold text-blue-600 hover:underline">Contactez notre support</Link>
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
