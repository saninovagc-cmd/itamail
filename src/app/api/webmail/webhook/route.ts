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

    const from = emailData.from || ''; // Expéditeur
    const to = emailData.to; // Destinataire(s)
    const cc = emailData.cc || [];
    const subject = emailData.subject;
    let text = emailData.text || '';
    let html = emailData.html || '';
    let attachments: any[] = Array.isArray(emailData.attachments) ? emailData.attachments : [];
    let fromHeader = from;

    // Resend n'inclut pas le corps du mail dans le webhook email.received (seulement email_id).
    // On récupère donc le contenu complet + les pièces jointes via l'API Receiving de Resend.
    const resendApiKey = process.env.RESEND_API_KEY;
    if (emailData.email_id && resendApiKey) {
      try {
        const [emailRes, attRes] = await Promise.all([
          fetch(`https://api.resend.com/emails/receiving/${emailData.email_id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${resendApiKey}` },
          }),
          fetch(`https://api.resend.com/emails/receiving/${emailData.email_id}/attachments`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${resendApiKey}` },
          }),
        ]);

        if (emailRes.ok) {
          const fullEmail = await emailRes.json();
          text = fullEmail.text || text || '';
          html = fullEmail.html || html || '';
          if (fullEmail.headers?.from) {
            fromHeader = fullEmail.headers.from;
          }
          if (Array.isArray(fullEmail.attachments) && fullEmail.attachments.length > 0) {
            attachments = fullEmail.attachments;
          }
        }

        if (attRes.ok) {
          const attData = await attRes.json();
          if (Array.isArray(attData?.data) && attData.data.length > 0) {
            attachments = attData.data;
          }
        }
      } catch (fetchErr) {
        console.error("[Webhook Inbound] Erreur lors de la récupération du corps/pièces jointes de l'e-mail:", fetchErr);
      }
    }

    // Protection si 'to' est manquant
    if (!to) {
      return NextResponse.json({ error: "Destinataire manquant dans le webhook" }, { status: 400 });
    }

    // Extraire le nom et l'adresse e-mail de l'expéditeur
    const senderMatch = fromHeader.match(/^(.*?)\s*<([^>]+)>$/);
    const senderName = senderMatch
      ? senderMatch[1].replace(/^["']|["']$/g, '').trim() || senderMatch[2].trim()
      : from.replace(/<[^>]+>/g, '').trim() || from;
    const senderEmail = senderMatch ? senderMatch[2].trim() : (from.match(/<([^>]+)>/)?.[1] || from).trim();

    // Extraire l'adresse e-mail pure du destinataire
    const toList: string[] = Array.isArray(to) ? to : [to];
    const ccList: string[] = Array.isArray(cc) ? cc : (cc ? [cc] : []);
    const recipientStr = toList[0];
    const emailMatch = recipientStr.match(/<([^>]+)>/);
    const recipientEmail = (emailMatch ? emailMatch[1] : recipientStr).trim().toLowerCase();

    // Construire le bloc de métadonnées (ID Resend, CC, pièces jointes) stocké dans body_html
    const metaPayload = {
      resend_id: emailData.email_id || null,
      to_all: toList,
      cc: ccList,
      attachments: attachments.map((a: any) => ({
        id: a.id,
        filename: a.filename || 'piece-jointe',
        size: a.size || 0,
        content_type: a.content_type || 'application/octet-stream',
        download_url: a.download_url || null,
      })),
    };
    const htmlWithMeta = `${html || ''}<!--ITA_META:${JSON.stringify(metaPayload)}-->`;

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
        sender_name: senderName, 
        sender_email: senderEmail,
        recipient_email: toList.join(', '),
        subject: subject || '(Sans objet)',
        body_text: text || '',
        body_html: htmlWithMeta,
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
