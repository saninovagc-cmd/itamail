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

// POST: Ouvrir un e-mail, marquer comme lu, et récupérer le corps / les pièces jointes depuis Resend si nécessaire
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messageId, markAsRead = true } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'messageId requis' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (msgErr || !msg) {
      return NextResponse.json({ error: 'Message introuvable' }, { status: 404 });
    }

    if (markAsRead && !msg.is_read) {
      await supabase.from('messages').update({ is_read: true }).eq('id', messageId);
    }

    const { cleanHtml, meta } = parseMeta(msg.body_html);
    let text = msg.body_text || '';
    let html = cleanHtml || '';
    let resendId: string | null = meta?.resend_id || null;
    let ccList: string[] = meta?.cc || [];
    let toList: string[] = meta?.to_all || (msg.recipient_email ? msg.recipient_email.split(',').map((s: string) => s.trim()) : []);
    let attachments: any[] = meta?.attachments || [];
    let senderName = msg.sender_name || msg.sender_email;

    const resendApiKey = process.env.RESEND_API_KEY;

    // Si c'est un mail reçu (ou déplacé depuis inbox) et qu'il manque le corps ou qu'on veut rafraîchir les liens de pièces jointes
    if (resendApiKey && msg.folder !== 'sent' && msg.folder !== 'drafts') {
      // 1. Si on n'a pas encore le resend_id (ex: anciens mails reçus avant la mise à jour du webhook), on le cherche dans Resend
      if (!resendId && (!text && !html)) {
        try {
          const listRes = await fetch('https://api.resend.com/emails/receiving?limit=50', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${resendApiKey}` },
          });
          if (listRes.ok) {
            const listData = await listRes.json();
            const items: any[] = listData?.data || [];
            const targetSender = (msg.sender_email || '').toLowerCase().trim();
            const targetSubject = (msg.subject || '').toLowerCase().trim();

            const found = items.find((item: any) => {
              const itemFrom = (item.from || '').toLowerCase();
              const itemSubj = (item.subject || '(sans objet)').toLowerCase().trim();
              return (itemFrom.includes(targetSender) || targetSender.includes(itemFrom)) &&
                     (itemSubj === targetSubject || (!item.subject && targetSubject === '(sans objet)'));
            });

            if (found?.id) {
              resendId = found.id;
            }
          }
        } catch (err) {
          console.error('[Webmail Message API] Erreur recherche Resend receiving list:', err);
        }
      }

      // 2. Si on a le resendId, on récupère le contenu complet (s'il manquait) et les URLs fraîches des pièces jointes
      if (resendId) {
        try {
          const needBody = !text && !html;
          const needAttachments = needBody || attachments.length > 0;

          const [emailRes, attRes] = await Promise.all([
            needBody
              ? fetch(`https://api.resend.com/emails/receiving/${resendId}`, {
                  method: 'GET',
                  headers: { 'Authorization': `Bearer ${resendApiKey}` },
                })
              : Promise.resolve(null),
            needAttachments
              ? fetch(`https://api.resend.com/emails/receiving/${resendId}/attachments`, {
                  method: 'GET',
                  headers: { 'Authorization': `Bearer ${resendApiKey}` },
                })
              : Promise.resolve(null),
          ]);

          let shouldUpdateDb = false;

          if (emailRes && emailRes.ok) {
            const fullEmail = await emailRes.json();
            text = fullEmail.text || text || '';
            html = fullEmail.html || html || '';
            if (Array.isArray(fullEmail.cc) && fullEmail.cc.length > 0) {
              ccList = fullEmail.cc;
            }
            if (Array.isArray(fullEmail.to) && fullEmail.to.length > 0) {
              toList = fullEmail.to;
            }
            if (fullEmail.headers?.from) {
              const senderMatch = fullEmail.headers.from.match(/^(.*?)\s*<([^>]+)>$/);
              if (senderMatch && senderMatch[1].trim()) {
                senderName = senderMatch[1].replace(/^["']|["']$/g, '').trim();
              }
            }
            if (Array.isArray(fullEmail.attachments) && fullEmail.attachments.length > 0 && attachments.length === 0) {
              attachments = fullEmail.attachments;
            }
            shouldUpdateDb = true;
          }

          if (attRes && attRes.ok) {
            const attData = await attRes.json();
            if (Array.isArray(attData?.data)) {
              attachments = attData.data.map((a: any) => ({
                id: a.id,
                filename: a.filename || 'piece-jointe',
                size: a.size || 0,
                content_type: a.content_type || 'application/octet-stream',
                download_url: a.download_url || null,
              }));
              shouldUpdateDb = true;
            }
          }

          if (shouldUpdateDb) {
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
                is_read: true,
              })
              .eq('id', messageId);
          }
        } catch (err) {
          console.error('[Webmail Message API] Erreur récupération détails Resend:', err);
        }
      }
    } else if (resendApiKey && msg.folder === 'sent' && resendId && attachments.length > 0) {
      try {
        const attRes = await fetch(`https://api.resend.com/emails/${resendId}/attachments`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${resendApiKey}` },
        });
        if (attRes.ok) {
          const attData = await attRes.json();
          if (Array.isArray(attData?.data) && attData.data.length > 0) {
            attachments = attData.data.map((a: any) => ({
              id: a.id,
              filename: a.filename || 'piece-jointe',
              size: a.size || 0,
              content_type: a.content_type || 'application/octet-stream',
              download_url: a.download_url || null,
            }));
          }
        }
      } catch (err) {
        console.error('[Webmail Message API] Erreur récupération pièces jointes envoyées:', err);
      }
    }

    return NextResponse.json({
      success: true,
      id: msg.id,
      sender_name: senderName,
      sender_email: msg.sender_email,
      recipient_email: msg.recipient_email,
      to_all: toList,
      cc: ccList,
      subject: msg.subject,
      body_text: text,
      body_html: html,
      resend_id: resendId,
      attachments,
    });
  } catch (error) {
    console.error('[Webmail Message API] Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// GET: Télécharger une pièce jointe en forçant le téléchargement navigateur (Content-Disposition: attachment)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let downloadUrl = searchParams.get('downloadUrl');
    const resendId = searchParams.get('resendId');
    const attachmentId = searchParams.get('attachmentId');
    const folder = searchParams.get('folder') || 'inbox';
    const filename = searchParams.get('filename') || 'piece-jointe';
    const contentType = searchParams.get('contentType') || 'application/octet-stream';

    const resendApiKey = process.env.RESEND_API_KEY;

    // Si on a resendId et attachmentId, on peut récupérer une URL fraîche depuis Resend
    if (resendId && attachmentId && resendApiKey && !attachmentId.startsWith('sent-att-')) {
      try {
        const endpoint =
          folder === 'sent'
            ? `https://api.resend.com/emails/${resendId}/attachments/${attachmentId}`
            : `https://api.resend.com/emails/receiving/${resendId}/attachments/${attachmentId}`;
        const attRes = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${resendApiKey}` },
        });
        if (attRes.ok) {
          const attInfo = await attRes.json();
          if (attInfo?.download_url) {
            downloadUrl = attInfo.download_url;
          }
        }
      } catch (e) {
        console.error('[Download Attachment] Erreur récupération URL fraîche:', e);
      }
    }

    if (!downloadUrl) {
      return NextResponse.json({ error: 'Lien de téléchargement introuvable' }, { status: 400 });
    }

    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'Impossible de télécharger le fichier distant' }, { status: 502 });
    }

    const fileBuffer = await fileRes.arrayBuffer();
    const safeFilename = filename.replace(/["\r\n]/g, '_');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': fileRes.headers.get('content-type') || contentType,
        'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[Download Attachment] Erreur:', error);
    return NextResponse.json({ error: 'Erreur lors du téléchargement de la pièce jointe' }, { status: 500 });
  }
}
