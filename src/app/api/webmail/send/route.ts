import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { from, to, cc, bcc, subject, text } = await request.json();

    // 1. Validation basique
    if (!to || !subject || !text) {
      return NextResponse.json({ error: "Des champs obligatoires sont manquants." }, { status: 400 });
    }

    // 2. Récupération de la clé API Resend depuis l'environnement
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      // Si la clé n'est pas encore configurée, on renvoie une simulation de succès
      // (Pratique pendant que le client configure son compte Resend)
      console.log("[Simulation d'envoi SMTP] E-mail intercepté car RESEND_API_KEY est manquante.");
      console.log(`De: ${from} | À: ${to} | Objet: ${subject}`);
      
      return NextResponse.json({ 
        success: true, 
        mocked: true, 
        message: "E-mail simulé avec succès (Clé API non configurée)." 
      });
    }

    // 3. Préparation du payload pour l'API Resend
    // L'adresse 'from' DOIT être vérifiée sur votre compte Resend (ex: 'contact@itamya.store')
    const payload: any = {
      from: from || "ITA MAIL <onboarding@resend.dev>", // L'adresse par défaut de test Resend
      to: to.split(',').map((email: string) => email.trim()),
      subject: subject,
      text: text,
    };

    if (cc) payload.cc = cc.split(',').map((email: string) => email.trim());
    if (bcc) payload.bcc = bcc.split(',').map((email: string) => email.trim());

    // 4. Appel HTTP natif vers l'API Resend (pas besoin de d'installer le package 'resend')
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.message || "Erreur lors de l'envoi de l'e-mail." }, { status: res.status });
    }

    return NextResponse.json({ success: true, id: data.id });
    
  } catch (error: any) {
    console.error("Erreur serveur API webmail:", error);
    return NextResponse.json({ error: "Erreur serveur interne." }, { status: 500 });
  }
}
