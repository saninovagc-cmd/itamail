import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function parseMeta(rawHtml: string | null | undefined) {
  if (!rawHtml) return { cleanHtml: '', meta: null };
  const match = rawHtml.match(/<!--ITA_META:([\s\S]*?)-->$/);
  if (!match) return { cleanHtml: rawHtml, meta: null };
  try {
    const meta = JSON.parse(match[1]);
    const cleanHtml = rawHtml.slice(0, match.index);
    return { cleanHtml, meta };
  } catch {
    return { cleanHtml: rawHtml, meta: null };
  }
}

// Fonction de parsing minimaliste pour extraire le texte et l'HTML d'un EML/MIME brut si nécessaire
function extractFromRawEml(rawContent: string): { text: string; html: string } {
  let text = '';
  let html = '';

  try {
    // Si c'est un message simple text/plain
    if (rawContent.includes('Content-Type: text/html')) {
      const htmlParts = rawContent.split(/Content-Type:\s*text\/html[^\r\n]*/i);
      if (htmlParts.length > 1) {
        const afterHeader = htmlParts[1].replace(/^[^\r\n]*\r?\n\r?\n/, '');
        const boundaryMatch = rawContent.match(/boundary="?([^"\r\n]+)"?/i);
        if (boundaryMatch) {
          html = afterHeader.split(new RegExp(`--${boundaryMatch[1]}`, 'g'))[0].trim();
        } else {
          html = afterHeader.split(/\r?\n--/)[0].trim();
        }
      }
    }

    if (rawContent.includes('Content-Type: text/plain')) {
      const textParts = rawContent.split(/Content-Type:\s*text\/plain[^\r\n]*/i);
      if (textParts.length > 1) {
        const afterHeader = textParts[1].replace(/^[^\r\n]*\r?\n\r?\n/, '');
        const boundaryMatch = rawContent.match(/boundary="?([^"\r\n]+)"?/i);
        if (boundaryMatch) {
          text = afterHeader.split(new RegExp(`--${boundaryMatch[1]}`, 'g'))[0].trim();
        } else {
          text = afterHeader.split(/\r?\n--/)[0].trim();
        }
      }
    }

    // Décodage quoted-printable basique si présent
    const decodeQP = (str: string) =>
      str.replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
         .replace(/=\r?\n/g, '');

    if (html.includes('=\n') || html.includes('=\r\n') || /=([0-9A-F]{2})/i.test(html)) {
      html = decodeQP(html);
    }
    if (text.includes('=\n') || text.includes('=\r\n') || /=([0-9A-F]{2})/i.test(text)) {
      text = decodeQP(text);
    }
  } catch (e) {
    console.error('[extractFromRawEml] Erreur:', e);
  }

  return { text, html };
}

// GET & POST: Synchroniser ou forcer la récupération du contenu complet des e-mails
export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}

async function handleSync(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let targetMessageId = searchParams.get('messageId');
    let customApiKey = searchParams.get('apiKey');
    let targetEmailAddress = searchParams.get('email');

    // Lire aussi le body JSON si disponible
    if (request.method === 'POST') {
      try {
        const body = await request.clone().json();
        if (body.messageId) targetMessageId = body.messageId;
        if (body.email) targetEmailAddress = body.email;
        if (body.apiKey) customApiKey = body.apiKey;
      } catch {}
    }

    const resendApiKey = customApiKey || process.env.RESEND_API_KEY;
    const maskedKey = resendApiKey
      ? `${resendApiKey.slice(0, 7)}...${resendApiKey.slice(-4)}`
      : null;

    if (!resendApiKey) {
      return NextResponse.json({
        success: false,
        error: "RESEND_API_KEY n'est pas configurée dans les variables d'environnement.",
        has_api_key: false,
      }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sélectionner les messages à synchroniser
    let query = supabase
      .from('messages')
      .select('*')
      .neq('folder', 'sent')
      .neq('folder', 'drafts');

    if (targetMessageId) {
      query = query.eq('id', targetMessageId);
    } else if (targetEmailAddress) {
      // Trouver la boîte
      const { data: mb } = await supabase
        .from('mailboxes')
        .select('id')
        .eq('address', targetEmailAddress)
        .single();
      if (mb?.id) {
        query = query.eq('mailbox_id', mb.id);
      }
    }

    const { data: messages, error: dbErr } = await query.order('created_at', { ascending: false }).limit(30);

    if (dbErr) {
      return NextResponse.json({ error: "Erreur Supabase", details: dbErr.message }, { status: 500 });
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ success: true, message: "Aucun message trouvé à synchroniser.", updated_count: 0 });
    }

    // Récupérer la liste des emails récents sur Resend si besoin de matcher
    let resendReceivingList: any[] = [];
    try {
      const listRes = await fetch('https://api.resend.com/emails/receiving?limit=100', {
        headers: { Authorization: `Bearer ${resendApiKey}` },
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        resendReceivingList = listData?.data || [];
      } else {
        console.warn(`[Sync API] Impossible de lister emails/receiving: ${listRes.status} ${await listRes.text()}`);
      }
    } catch (e) {
      console.warn('[Sync API] Erreur fetch receiving list:', e);
    }

    const results = [];

    for (const msg of messages) {
      const { cleanHtml, meta } = parseMeta(msg.body_html);
      let text = msg.body_text || '';
      let html = cleanHtml || '';
      let resendId: string | null = meta?.resend_id || null;
      let attachments: any[] = meta?.attachments || [];
      let senderName = msg.sender_name || msg.sender_email;
      let toList: string[] = meta?.to_all || (msg.recipient_email ? msg.recipient_email.split(',').map((s: string) => s.trim()) : []);
      let ccList: string[] = meta?.cc || [];

      // Si le message a déjà du texte ou du HTML et que ses pièces jointes ont des URLs de téléchargement fraîches, on peut sauter sauf si targetMessageId forcé
      const needsSync = !text && !html || !targetMessageId;

      // 1. Trouver le resendId si manquant
      if (!resendId && resendReceivingList.length > 0) {
        const targetSender = (msg.sender_email || '').toLowerCase().trim();
        const targetSubj = (msg.subject || '').toLowerCase().trim();
        const found = resendReceivingList.find((item: any) => {
          const itemFrom = (item.from || '').toLowerCase();
          const itemSubj = (item.subject || '(sans objet)').toLowerCase().trim();
          return (itemFrom.includes(targetSender) || targetSender.includes(itemFrom)) &&
                 (itemSubj === targetSubj || (!item.subject && targetSubj === '(sans objet)'));
        });
        if (found?.id) {
          resendId = found.id;
        }
      }

      if (!resendId) {
        results.push({
          id: msg.id,
          subject: msg.subject,
          status: 'skipped',
          reason: 'resend_id introuvable',
        });
        continue;
      }

      // 2. Interroger Resend Receiving API
      let emailApiStatus = null;
      let emailApiError = null;
      let attApiStatus = null;
      let updated = false;

      try {
        const [emailRes, attRes] = await Promise.all([
          fetch(`https://api.resend.com/emails/receiving/${resendId}`, {
            headers: { Authorization: `Bearer ${resendApiKey}` },
          }),
          fetch(`https://api.resend.com/emails/receiving/${resendId}/attachments`, {
            headers: { Authorization: `Bearer ${resendApiKey}` },
          }),
        ]);

        emailApiStatus = emailRes.status;
        attApiStatus = attRes.status;

        if (emailRes.ok) {
          const fullEmail = await emailRes.json();
          let fetchedText = fullEmail.text || '';
          let fetchedHtml = fullEmail.html || '';

          // Si Resend a renvoyé du raw et que text & html sont vides
          if (!fetchedText && !fetchedHtml && fullEmail.raw?.download_url) {
            try {
              const rawRes = await fetch(fullEmail.raw.download_url);
              if (rawRes.ok) {
                const rawEml = await rawRes.text();
                const extracted = extractFromRawEml(rawEml);
                fetchedText = extracted.text;
                fetchedHtml = extracted.html;
              }
            } catch (rawErr) {
              console.error(`[Sync API] Erreur fetch raw EML pour ${resendId}:`, rawErr);
            }
          }

          if (fetchedText) text = fetchedText;
          if (fetchedHtml) html = fetchedHtml;

          if (Array.isArray(fullEmail.to) && fullEmail.to.length > 0) toList = fullEmail.to;
          if (Array.isArray(fullEmail.cc) && fullEmail.cc.length > 0) ccList = fullEmail.cc;
          if (fullEmail.headers?.from) {
            const senderMatch = fullEmail.headers.from.match(/^(.*?)\s*<([^>]+)>$/);
            if (senderMatch && senderMatch[1].trim()) {
              senderName = senderMatch[1].replace(/^["']|["']$/g, '').trim();
            }
          }
          updated = true;
        } else {
          emailApiError = await emailRes.text();
        }

        if (attRes.ok) {
          const attData = await attRes.json();
          if (Array.isArray(attData?.data)) {
            attachments = attData.data.map((a: any) => ({
              id: a.id,
              filename: a.filename || 'piece-jointe',
              size: a.size || 0,
              content_type: a.content_type || 'application/octet-stream',
              download_url: a.download_url || null,
            }));
            updated = true;
          }
        }

        if (updated) {
          const newMeta = {
            resend_id: resendId,
            to_all: toList,
            cc: ccList,
            attachments,
          };
          const htmlWithMeta = `${html || ''}<!--ITA_META:${JSON.stringify(newMeta)}-->`;

          await supabase
            .from('messages')
            .update({
              sender_name: senderName,
              body_text: text,
              body_html: htmlWithMeta,
            })
            .eq('id', msg.id);

          results.push({
            id: msg.id,
            subject: msg.subject,
            status: 'updated',
            has_text: Boolean(text),
            has_html: Boolean(html),
            attachments_count: attachments.length,
          });
        } else {
          results.push({
            id: msg.id,
            subject: msg.subject,
            status: 'failed',
            resend_id: resendId,
            email_status: emailApiStatus,
            email_error: emailApiError,
            att_status: attApiStatus,
          });
        }
      } catch (itemErr: any) {
        results.push({
          id: msg.id,
          subject: msg.subject,
          status: 'error',
          error: itemErr.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      api_key_configured: Boolean(resendApiKey),
      key_preview: maskedKey,
      synced_total: results.filter(r => r.status === 'updated').length,
      results,
    });

  } catch (error: any) {
    console.error('[Webmail Sync API] Erreur générale:', error);
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
  }
}
