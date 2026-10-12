import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ce webhook recevra les requêtes POST de Resend à chaque nouvel e-mail entrant
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Ignorer si ce n'est pas un e-mail reçu (pour éviter les erreurs sur email.sent, email.delivered, etc.)
    if (payload.type && payload.type !== 'email.received') {
      return NextResponse.json({ success: true, ignored: true, reason: `Type d'événement non géré: ${payload.type}` });
    }

    // Structure du payload de Resend Inbound (peut être dans payload.data ou directement dans payload)
    const emailData = payload.data || payload;

    const from = emailData.from; // Expéditeur
    const to = emailData.to; // Destinataire (notre client)
    const subject = emailData.subject;
    let text = emailData.text;
    let html = emailData.html;

    // Resend n'inclut pas le corps du mail dans le webhook email.received (seulement email_id).
    // On récupère donc le contenu complet via l'API Receiving de Resend.
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!text && !html && emailData.email_id && resendApiKey) {
      try {
        const emailRes = await fetch(`https://api.resend.com/emails/receiving/${emailData.email_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
          },
        });
        if (emailRes.ok) {
          const fullEmail = await emailRes.json();
          text = fullEmail.text || '';
          html = fullEmail.html || '';
        }
      } catch (fetchErr) {
        console.error("[Webhook Inbound] Erreur lors de la récupération du corps de l'e-mail:", fetchErr);
      }
    }

    // Protection si 'to' est manquant
    if (!to) {
      return NextResponse.json({ error: "Destinataire manquant dans le webhook" }, { status: 400 });
    }

    // Extraire l'adresse e-mail pure du destinataire
    const recipientStr = Array.isArray(to) ? to[0] : to;
    const emailMatch = recipientStr.match(/<([^>]+)>/);
    const recipientEmail = emailMatch ? emailMatch[1] : recipientStr;

    // Initialisation de Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Trouver la boîte mail correspondante dans la base de données
    const { data: mailbox } = await supabase
      .from('mailboxes')
      .select('id')
      .eq('address', recipientEmail)
      .single();

    if (mailbox) {
      // 2. Enregistrer le message dans la table des messages
      await supabase.from('messages').insert({
        mailbox_id: mailbox.id,
        folder: 'inbox',
        sender_name: from, 
        sender_email: from,
        recipient_email: recipientEmail,
        subject: subject || '(Sans objet)',
        body_text: text || '',
        body_html: html || '',
        is_read: false
      });
      console.log(`[Webhook Inbound] E-mail reçu pour ${recipientEmail} et sauvegardé.`);
    } else {
      console.log(`[Webhook Inbound] Boîte mail non trouvée pour ${recipientEmail}.`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook Inbound Error:", error);
    return NextResponse.json({ error: "Erreur lors du traitement du webhook." }, { status: 500 });
  }
}
