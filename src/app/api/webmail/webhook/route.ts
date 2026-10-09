import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ce webhook recevra les requêtes POST de Resend à chaque nouvel e-mail entrant
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Structure du payload de Resend Inbound
    const from = payload.from; // Expéditeur
    const to = payload.to; // Destinataire (notre client)
    const subject = payload.subject;
    const text = payload.text;
    const html = payload.html;

    // Extraire l'adresse e-mail pure du destinataire (au cas où ce serait sous la forme "Nom <email@domaine.com>")
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
