"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Inbox, 
  Send, 
  FileText, 
  Trash2, 
  Search, 
  PenSquare,
  Star,
  Archive,
  Reply,
  ReplyAll,
  Forward,
  LogOut,
  Mail,
  MailOpen,
  CheckCircle,
  Paperclip,
  Folder,
  AlertOctagon,
  Download,
  RefreshCw,
  Printer,
  X,
  File,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Save
} from "lucide-react";

type AttachmentItem = {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  download_url?: string | null;
};

type ComposeAttachment = {
  filename: string;
  size: number;
  content_type: string;
  content: string; // Base64
};

type EmailItem = {
  id: string | number;
  mailbox_id?: string;
  sender: string;
  email: string;
  to: string;
  to_all?: string[];
  cc?: string[];
  subject: string;
  preview: string;
  date: string;
  fullDate?: string;
  read: boolean;
  starred?: boolean;
  folder: string;
  body: string;
  body_text: string;
  body_html: string;
  resend_id?: string | null;
  attachments: AttachmentItem[];
};

function parseMetaFromHtml(rawHtml: string | null | undefined): {
  cleanHtml: string;
  meta: {
    resend_id?: string | null;
    to_all?: string[];
    cc?: string[];
    starred?: boolean;
    attachments?: AttachmentItem[];
  } | null;
} {
  if (!rawHtml) return { cleanHtml: "", meta: null };
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

function buildHtmlWithMeta(cleanHtml: string, meta: any): string {
  return `${cleanHtml || ""}<!--ITA_META:${JSON.stringify(meta)}-->`;
}

function stripHtmlTags(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "Fichier";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) {
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

function formatFullDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function WebmailPage() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [mailboxId, setMailboxId] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [isLoadingEmailBody, setIsLoadingEmailBody] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [composerTitle, setComposerTitle] = useState("Nouveau message");
  const [editingDraftId, setEditingDraftId] = useState<string | number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // States rédaction
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // States du formulaire
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeAttachments, setComposeAttachments] = useState<ComposeAttachment[]>([]);

  const composeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composeToInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const formatDbMessage = (m: any): EmailItem => {
    const { cleanHtml, meta } = parseMetaFromHtml(m.body_html);
    const plainPreview = m.body_text || stripHtmlTags(cleanHtml) || "";
    const senderRaw = m.sender_name || m.sender_email || "Inconnu";
    const senderClean = senderRaw.replace(/<[^>]+>/g, "").replace(/^["']|["']$/g, "").trim() || m.sender_email;

    return {
      id: m.id,
      mailbox_id: m.mailbox_id,
      sender: senderClean,
      email: m.sender_email,
      to: m.recipient_email || "",
      to_all: meta?.to_all || (m.recipient_email ? m.recipient_email.split(",").map((s: string) => s.trim()) : []),
      cc: meta?.cc || [],
      subject: m.subject || "(Sans objet)",
      preview: plainPreview ? plainPreview.substring(0, 80) + (plainPreview.length > 80 ? "..." : "") : "(Cliquer pour charger le contenu)",
      date: formatShortDate(m.created_at),
      fullDate: formatFullDate(m.created_at),
      read: Boolean(m.is_read),
      starred: Boolean(meta?.starred),
      folder: m.folder || "inbox",
      body: m.body_text || stripHtmlTags(cleanHtml) || "",
      body_text: m.body_text || "",
      body_html: cleanHtml || "",
      resend_id: meta?.resend_id || null,
      attachments: Array.isArray(meta?.attachments) ? meta!.attachments : [],
    };
  };

  const fetchMessages = async (savedEmail: string, silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data: mailbox } = await supabase
        .from("mailboxes")
        .select("id")
        .eq("address", savedEmail)
        .single();

      if (mailbox) {
        setMailboxId(mailbox.id);
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .eq("mailbox_id", mailbox.id)
          .neq("folder", "deleted")
          .order("created_at", { ascending: false });

        if (msgs && msgs.length > 0) {
          const formattedMsgs = msgs.map(formatDbMessage);
          setEmails(formattedMsgs);
          if (selectedEmail) {
            const updatedSelected = formattedMsgs.find((item) => item.id === selectedEmail.id);
            if (updatedSelected) setSelectedEmail(updatedSelected);
          }
        } else {
          setEmails([]);
          setSelectedEmail(null);
        }
      }
    } catch (e) {
      console.error("Erreur de chargement des messages:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    const savedEmail = localStorage.getItem("webmail_user");
    if (!savedEmail) {
      window.location.href = "/webmail/login";
    } else {
      setUserEmail(savedEmail);
      fetchMessages(savedEmail);
    }
  }, []);

  // Ouvrir un e-mail, le marquer comme lu et récupérer son contenu complet / pièces jointes si besoin
  const handleSelectEmail = async (email: EmailItem) => {
    // Si c'est un brouillon, on l'ouvre dans l'éditeur
    if (email.folder === "drafts") {
      setEditingDraftId(email.id);
      setComposerTitle("Modifier le brouillon");
      setComposeTo(email.to || "");
      setComposeCc(email.cc?.join(", ") || "");
      setComposeBcc("");
      setShowCcBcc(Boolean(email.cc && email.cc.length > 0));
      setComposeSubject(email.subject === "(Sans objet)" ? "" : email.subject);
      setComposeBody(email.body_text || email.body || "");
      setComposeAttachments([]);
      setIsComposing(true);
      return;
    }

    // Mise à jour immédiate dans l'UI (sélection + marqué comme lu)
    const optimisticEmail = { ...email, read: true };
    setSelectedEmail(optimisticEmail);
    setEmails((prev) =>
      prev.map((item) => (item.id === email.id ? { ...item, read: true } : item))
    );

    const needsRemoteSync =
      (!email.body_text && !email.body_html) ||
      (email.attachments && email.attachments.length > 0) ||
      !email.read;

    if (!needsRemoteSync) return;

    try {
      if (!email.body_text && !email.body_html) {
        setIsLoadingEmailBody(true);
      }

      const res = await fetch("/api/webmail/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: email.id,
          markAsRead: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const plainPreview = data.body_text || stripHtmlTags(data.body_html) || "";
        const updatedItem: EmailItem = {
          ...optimisticEmail,
          sender: data.sender_name || optimisticEmail.sender,
          to_all: Array.isArray(data.to_all) ? data.to_all : optimisticEmail.to_all,
          cc: Array.isArray(data.cc) ? data.cc : optimisticEmail.cc,
          body_text: data.body_text ?? optimisticEmail.body_text,
          body_html: data.body_html ?? optimisticEmail.body_html,
          body: data.body_text || stripHtmlTags(data.body_html) || optimisticEmail.body,
          preview: plainPreview
            ? plainPreview.substring(0, 80) + (plainPreview.length > 80 ? "..." : "")
            : "(Aucun contenu texte)",
          resend_id: data.resend_id || optimisticEmail.resend_id,
          attachments: Array.isArray(data.attachments) ? data.attachments : optimisticEmail.attachments,
          read: true,
        };

        setSelectedEmail((curr) => (curr && curr.id === email.id ? updatedItem : curr));
        setEmails((prev) => prev.map((item) => (item.id === email.id ? updatedItem : item)));
      }
    } catch (err) {
      console.error("Erreur lors de l'ouverture du message:", err);
    } finally {
      setIsLoadingEmailBody(false);
    }
  };

  // Télécharger une pièce jointe
  const handleDownloadAttachment = (att: AttachmentItem, email: EmailItem) => {
    const params = new URLSearchParams();
    if (att.download_url) params.set("downloadUrl", att.download_url);
    if (email.resend_id) params.set("resendId", email.resend_id);
    if (att.id) params.set("attachmentId", att.id);
    params.set("folder", email.folder);
    params.set("filename", att.filename || "piece-jointe");
    params.set("contentType", att.content_type || "application/octet-stream");

    const url = `/api/webmail/message?${params.toString()}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = att.filename || "piece-jointe";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ajouter des pièces jointes dans le compositeur
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: ComposeAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) {
        alert(`Le fichier "${file.name}" dépasse la limite de 15 Mo.`);
        continue;
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Part = result.includes(",") ? result.split(",")[1] : result;
          resolve(base64Part);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      newAttachments.push({
        filename: file.name,
        size: file.size,
        content_type: file.type || "application/octet-stream",
        content: base64,
      });
    }

    setComposeAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const handleRemoveComposeAttachment = (index: number) => {
    setComposeAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Ouvrir un nouveau message vierge
  const handleOpenNewCompose = () => {
    setEditingDraftId(null);
    setComposerTitle("Nouveau message");
    setComposeTo("");
    setComposeCc("");
    setComposeBcc("");
    setComposeSubject("");
    setComposeBody("");
    setComposeAttachments([]);
    setShowCcBcc(false);
    setSentSuccess(false);
    setIsComposing(true);
    setTimeout(() => composeToInputRef.current?.focus(), 100);
  };

  // Action: Répondre
  const handleReply = (email: EmailItem) => {
    setEditingDraftId(null);
    const replyTarget = email.folder === "sent" ? email.to : email.email;
    const cleanSubj = email.subject.replace(/^(Re|Tr|Fwd)\s*:\s*/i, "");
    const quotedText = (email.body_text || email.body || "")
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");

    setComposerTitle(`Répondre à ${email.sender}`);
    setComposeTo(replyTarget);
    setComposeCc("");
    setComposeBcc("");
    setShowCcBcc(false);
    setComposeSubject(`Re: ${cleanSubj}`);
    setComposeBody(
      `\n\n---\nLe ${email.fullDate || email.date}, ${email.sender} <${email.email}> a écrit :\n${quotedText}`
    );
    setComposeAttachments([]);
    setSentSuccess(false);
    setIsComposing(true);
    setTimeout(() => {
      if (composeTextareaRef.current) {
        composeTextareaRef.current.focus();
        composeTextareaRef.current.setSelectionRange(0, 0);
      }
    }, 100);
  };

  // Action: Répondre à tous
  const handleReplyAll = (email: EmailItem) => {
    setEditingDraftId(null);
    const myEmailLower = (userEmail || "").toLowerCase().trim();
    const primaryRecipient = email.folder === "sent" ? email.to : email.email;

    // Collecter toutes les autres adresses dans À et Cc (sauf soi-même et le destinataire principal)
    const rawOthers = [
      ...(email.to_all || email.to.split(",").map((s) => s.trim())),
      ...(email.cc || []),
    ];

    const primaryLower = primaryRecipient.toLowerCase().trim();
    const uniqueCc: string[] = [];

    for (const addr of rawOthers) {
      const match = addr.match(/<([^>]+)>/);
      const pure = (match ? match[1] : addr).trim();
      const pureLower = pure.toLowerCase();
      if (
        pure &&
        pureLower !== myEmailLower &&
        pureLower !== primaryLower &&
        !uniqueCc.some((existing) => existing.toLowerCase() === pureLower)
      ) {
        uniqueCc.push(pure);
      }
    }

    const cleanSubj = email.subject.replace(/^(Re|Tr|Fwd)\s*:\s*/i, "");
    const quotedText = (email.body_text || email.body || "")
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");

    setComposerTitle(`Répondre à tous`);
    setComposeTo(primaryRecipient);
    setComposeCc(uniqueCc.join(", "));
    setComposeBcc("");
    setShowCcBcc(uniqueCc.length > 0);
    setComposeSubject(`Re: ${cleanSubj}`);
    setComposeBody(
      `\n\n---\nLe ${email.fullDate || email.date}, ${email.sender} <${email.email}> a écrit :\n${quotedText}`
    );
    setComposeAttachments([]);
    setSentSuccess(false);
    setIsComposing(true);
    setTimeout(() => {
      if (composeTextareaRef.current) {
        composeTextareaRef.current.focus();
        composeTextareaRef.current.setSelectionRange(0, 0);
      }
    }, 100);
  };

  // Action: Transférer
  const handleForward = (email: EmailItem) => {
    setEditingDraftId(null);
    const cleanSubj = email.subject.replace(/^(Re|Tr|Fwd)\s*:\s*/i, "");
    const ccHeader = email.cc && email.cc.length > 0 ? `\nCc : ${email.cc.join(", ")}` : "";
    const forwardHeader = `\n\n---------- Message transféré ----------\nDe : ${email.sender} <${email.email}>\nDate : ${email.fullDate || email.date}\nObjet : ${email.subject}\nÀ : ${email.to || userEmail}${ccHeader}\n\n${email.body_text || email.body || ""}`;

    setComposerTitle("Transférer le message");
    setComposeTo("");
    setComposeCc("");
    setComposeBcc("");
    setShowCcBcc(false);
    setComposeSubject(`Tr: ${cleanSubj}`);
    setComposeBody(forwardHeader);
    setComposeAttachments([]);
    setSentSuccess(false);
    setIsComposing(true);
    setTimeout(() => composeToInputRef.current?.focus(), 100);
  };

  // Déplacer un e-mail vers un dossier (Corbeille, Spams, Archive/Dossiers, Boîte de réception)
  const handleMoveToFolder = async (email: EmailItem, targetFolder: string, labelAction: string) => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      await supabase.from("messages").update({ folder: targetFolder }).eq("id", email.id);

      if (targetFolder === "deleted") {
        setEmails((prev) => prev.filter((item) => item.id !== email.id));
      } else {
        setEmails((prev) =>
          prev.map((item) => (item.id === email.id ? { ...item, folder: targetFolder } : item))
        );
      }

      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
      }
      showToast(labelAction);
    } catch (e) {
      console.error("Erreur déplacement message:", e);
    }
  };

  // Marquer comme lu / non lu
  const handleToggleRead = async (email: EmailItem) => {
    const nextRead = !email.read;
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      await supabase.from("messages").update({ is_read: nextRead }).eq("id", email.id);

      setEmails((prev) =>
        prev.map((item) => (item.id === email.id ? { ...item, read: nextRead } : item))
      );
      if (selectedEmail?.id === email.id) {
        setSelectedEmail({ ...selectedEmail, read: nextRead });
      }
      showToast(nextRead ? "Marqué comme lu" : "Marqué comme non lu");
    } catch (e) {
      console.error("Erreur statut lecture:", e);
    }
  };

  // Marquer comme Important / Favori (étoile)
  const handleToggleStar = async (email: EmailItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStarred = !email.starred;
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const newMeta = {
        resend_id: email.resend_id || null,
        to_all: email.to_all || [],
        cc: email.cc || [],
        starred: nextStarred,
        attachments: email.attachments || [],
      };
      const htmlWithMeta = buildHtmlWithMeta(email.body_html, newMeta);

      await supabase.from("messages").update({ body_html: htmlWithMeta }).eq("id", email.id);

      setEmails((prev) =>
        prev.map((item) => (item.id === email.id ? { ...item, starred: nextStarred } : item))
      );
      if (selectedEmail?.id === email.id) {
        setSelectedEmail({ ...selectedEmail, starred: nextStarred });
      }
    } catch (err) {
      console.error("Erreur favori:", err);
    }
  };

  // Enregistrer en brouillon
  const handleSaveDraft = async () => {
    if (!composeTo && !composeSubject && !composeBody) {
      setIsComposing(false);
      return;
    }

    setIsSavingDraft(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      let currentMailboxId = mailboxId;
      if (!currentMailboxId && userEmail) {
        const { data: mb } = await supabase
          .from("mailboxes")
          .select("id")
          .eq("address", userEmail)
          .single();
        currentMailboxId = mb?.id || null;
      }

      if (currentMailboxId) {
        const metaPayload = {
          cc: composeCc ? composeCc.split(",").map((s) => s.trim()).filter(Boolean) : [],
          attachments: [],
        };
        const htmlWithMeta = buildHtmlWithMeta("", metaPayload);

        if (editingDraftId) {
          await supabase
            .from("messages")
            .update({
              recipient_email: composeTo || "",
              subject: composeSubject || "(Sans objet)",
              body_text: composeBody || "",
              body_html: htmlWithMeta,
            })
            .eq("id", editingDraftId);
        } else {
          await supabase.from("messages").insert({
            mailbox_id: currentMailboxId,
            folder: "drafts",
            sender_name: "Moi",
            sender_email: userEmail || "",
            recipient_email: composeTo || "",
            subject: composeSubject || "(Sans objet)",
            body_text: composeBody || "",
            body_html: htmlWithMeta,
            is_read: true,
          });
        }

        if (userEmail) await fetchMessages(userEmail, true);
      }

      setIsComposing(false);
      setEditingDraftId(null);
      showToast("Brouillon enregistré");
    } catch (e) {
      console.error("Erreur sauvegarde brouillon:", e);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Imprimer l'e-mail ouvert
  const handlePrintEmail = (email: EmailItem) => {
    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) return;
    const contentHtml = email.body_html || `<pre style="white-space:pre-wrap;font-family:sans-serif;">${email.body_text || email.body}</pre>`;
    printWindow.document.write(`
      <html>
        <head>
          <title>${email.subject}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 32px; color: #1e293b; }
            h1 { font-size: 22px; margin-bottom: 16px; }
            .meta { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; font-size: 14px; color: #475569; line-height: 1.6; }
          </style>
        </head>
        <body>
          <h1>${email.subject}</h1>
          <div class="meta">
            <div><strong>De :</strong> ${email.sender} &lt;${email.email}&gt;</div>
            <div><strong>À :</strong> ${email.to || userEmail}</div>
            ${email.cc && email.cc.length > 0 ? `<div><strong>Cc :</strong> ${email.cc.join(", ")}</div>` : ""}
            <div><strong>Date :</strong> ${email.fullDate || email.date}</div>
          </div>
          <div>${contentHtml}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleLogout = () => {
    localStorage.removeItem("webmail_user");
    window.location.href = "/webmail/login";
  };

  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      alert("Veuillez remplir les champs À, Objet et Message.");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/webmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: userEmail,
          to: composeTo,
          cc: showCcBcc && composeCc ? composeCc : undefined,
          bcc: showCcBcc && composeBcc ? composeBcc : undefined,
          subject: composeSubject,
          text: composeBody,
          attachments: composeAttachments,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur d'envoi");
      }

      // Si c'était un brouillon, on le supprime des brouillons
      if (editingDraftId) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase.from("messages").update({ folder: "deleted" }).eq("id", editingDraftId);
      }

      // Ajouter ou rafraîchir la liste des e-mails
      if (userEmail) {
        await fetchMessages(userEmail, true);
      } else {
        setEmails((prev) => [
          {
            id: result.messageId || Date.now(),
            sender: "Moi",
            email: userEmail || "",
            to: composeTo,
            to_all: composeTo.split(",").map((s) => s.trim()),
            cc: showCcBcc && composeCc ? composeCc.split(",").map((s) => s.trim()) : [],
            subject: composeSubject,
            preview: composeBody.substring(0, 80) + "...",
            date: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
            fullDate: formatFullDate(new Date().toISOString()),
            read: true,
            folder: "sent",
            body: composeBody,
            body_text: composeBody,
            body_html: "",
            resend_id: result.id || null,
            attachments: composeAttachments.map((att, idx) => ({
              id: `sent-${idx}`,
              filename: att.filename,
              size: att.size,
              content_type: att.content_type,
            })),
          },
          ...prev,
        ]);
      }

      setSentSuccess(true);
      setTimeout(() => {
        setIsComposing(false);
        setSentSuccess(false);
        setShowCcBcc(false);
        setEditingDraftId(null);
        setComposeTo("");
        setComposeCc("");
        setComposeBcc("");
        setComposeSubject("");
        setComposeBody("");
        setComposeAttachments([]);
      }, 1800);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Une erreur est survenue lors de l'envoi.");
    } finally {
      setIsSending(false);
    }
  };

  // Compteurs dynamiques par dossier
  const unreadInboxCount = emails.filter((e) => e.folder === "inbox" && !e.read).length;
  const draftsCount = emails.filter((e) => e.folder === "drafts").length;
  const spamsCount = emails.filter((e) => e.folder === "spams" && !e.read).length;

  const filteredEmails = emails.filter((e) => {
    if (e.folder !== activeFolder) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.subject.toLowerCase().includes(q) ||
      e.sender.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.to && e.to.toLowerCase().includes(q)) ||
      (e.body && e.body.toLowerCase().includes(q))
    );
  });

  if (!isClient || !userEmail) return null;

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900">
      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* HEADER PREMIUM */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-3 w-64">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
            <Mail className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
            ITA Webmail
          </span>
        </div>

        <div className="flex-1 max-w-2xl mx-8">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Rechercher un message, un contact, un contenu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-slate-100/70 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10 rounded-full text-sm transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">{userEmail}</p>
            <p className="text-xs font-medium text-emerald-500 flex items-center justify-end">
              Connecté
            </p>
          </div>
          <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer shadow-md ring-2 ring-white hover:scale-105 transition-transform">
            {userEmail.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-64 bg-white/50 backdrop-blur-sm border-r border-slate-200/60 flex flex-col p-4 z-10">
          <button
            onClick={handleOpenNewCompose}
            className="w-full group flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-md shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-[0.98] mb-8"
          >
            <PenSquare className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            Nouveau message
          </button>

          <nav className="flex-1 space-y-1.5">
            {[
              { id: "inbox", label: "Boîte de réception", icon: Inbox, count: unreadInboxCount },
              { id: "sent", label: "Envoyés", icon: Send, count: 0 },
              { id: "drafts", label: "Brouillons", icon: FileText, count: draftsCount },
              { id: "spams", label: "Spams", icon: AlertOctagon, count: spamsCount },
              { id: "trash", label: "Corbeille", icon: Trash2, count: 0 },
              { id: "folders", label: "Archives", icon: Folder, count: 0 },
            ].map((folder) => (
              <button
                key={folder.id}
                onClick={() => {
                  setActiveFolder(folder.id);
                  setSelectedEmail(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeFolder === folder.id
                    ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100/50"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center">
                  <folder.icon
                    className={`h-4 w-4 mr-3 ${
                      activeFolder === folder.id ? "text-blue-600" : "text-slate-400"
                    }`}
                  />
                  {folder.label}
                </div>
                {folder.count > 0 && (
                  <span
                    className={`text-xs py-0.5 px-2 rounded-full font-semibold ${
                      activeFolder === folder.id
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {folder.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-200/60">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-slate-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" /> Déconnexion
            </button>
          </div>
        </div>

        {/* LISTE DES MAILS */}
        <div className="w-[380px] bg-white border-r border-slate-200/60 flex flex-col flex-shrink-0 relative z-0">
          <div className="px-5 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-800 tracking-tight">
              {activeFolder === "inbox"
                ? "Boîte de réception"
                : activeFolder === "sent"
                ? "Messages envoyés"
                : activeFolder === "drafts"
                ? "Brouillons"
                : activeFolder === "spams"
                ? "Spams"
                : activeFolder === "folders"
                ? "Archives"
                : "Corbeille"}
            </h2>
            <button
              onClick={() => userEmail && fetchMessages(userEmail)}
              title="Actualiser les messages"
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 px-4 text-center">
                <Inbox className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">Aucun message dans ce dossier</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`p-4 cursor-pointer transition-all duration-200 relative group ${
                      selectedEmail?.id === email.id
                        ? "bg-blue-50/70 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-blue-600"
                        : !email.read
                        ? "bg-blue-50/20 hover:bg-slate-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {!email.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                        )}
                        <h3
                          className={`text-sm truncate ${
                            !email.read ? "font-bold text-slate-900" : "font-medium text-slate-700"
                          }`}
                        >
                          {activeFolder === "sent" || activeFolder === "drafts"
                            ? `À : ${email.to || "(Destinataire non défini)"}`
                            : email.sender}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {email.attachments && email.attachments.length > 0 && (
                          <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        <span
                          className={`text-[11px] font-medium ${
                            !email.read ? "text-blue-600 font-semibold" : "text-slate-400"
                          }`}
                        >
                          {email.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4
                        className={`text-sm truncate ${
                          !email.read ? "font-semibold text-slate-900" : "text-slate-600"
                        }`}
                      >
                        {email.subject}
                      </h4>
                      <button
                        onClick={(e) => handleToggleStar(email, e)}
                        className={`p-0.5 rounded transition-colors ${
                          email.starred
                            ? "text-amber-400"
                            : "text-transparent group-hover:text-slate-300 hover:!text-amber-400"
                        }`}
                        title="Important"
                      >
                        <Star className={`h-3.5 w-3.5 ${email.starred ? "fill-amber-400" : ""}`} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {email.preview}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* LECTURE DU MAIL */}
        <div className="flex-1 bg-white flex flex-col relative overflow-hidden">
          {selectedEmail ? (
            <>
              {/* Toolbar complète */}
              <div className="h-14 border-b border-slate-200/60 flex items-center px-6 gap-1.5 bg-white/95 backdrop-blur-sm flex-shrink-0">
                <button
                  onClick={() => handleReply(selectedEmail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Répondre"
                >
                  <Reply className="h-4 w-4" />
                  <span className="hidden md:inline">Répondre</span>
                </button>
                <button
                  onClick={() => handleReplyAll(selectedEmail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Répondre à tous"
                >
                  <ReplyAll className="h-4 w-4" />
                  <span className="hidden md:inline">Répondre à tous</span>
                </button>
                <button
                  onClick={() => handleForward(selectedEmail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Transférer"
                >
                  <Forward className="h-4 w-4" />
                  <span className="hidden md:inline">Transférer</span>
                </button>

                <div className="w-px h-5 bg-slate-200 mx-1.5" />

                {selectedEmail.folder !== "folders" && (
                  <button
                    onClick={() =>
                      handleMoveToFolder(selectedEmail, "folders", "Message archivé")
                    }
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Archiver"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                )}

                {selectedEmail.folder !== "spams" ? (
                  <button
                    onClick={() =>
                      handleMoveToFolder(selectedEmail, "spams", "Signalé comme spam")
                    }
                    className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Déplacer vers les Spams"
                  >
                    <AlertOctagon className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      handleMoveToFolder(
                        selectedEmail,
                        "inbox",
                        "Restauré dans la boîte de réception"
                      )
                    }
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Ce n'est pas un spam (Restaurer)"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}

                {selectedEmail.folder !== "trash" ? (
                  <button
                    onClick={() =>
                      handleMoveToFolder(selectedEmail, "trash", "Déplacé dans la corbeille")
                    }
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Mettre à la corbeille"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() =>
                        handleMoveToFolder(
                          selectedEmail,
                          "inbox",
                          "Message restauré dans la boîte de réception"
                        )
                      }
                      className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Restaurer le message"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        handleMoveToFolder(
                          selectedEmail,
                          "deleted",
                          "Message supprimé définitivement"
                        )
                      }
                      className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      title="Supprimer définitivement"
                    >
                      Supprimer définitivement
                    </button>
                  </>
                )}

                <div className="w-px h-5 bg-slate-200 mx-1.5" />

                <button
                  onClick={() => handleToggleRead(selectedEmail)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title={selectedEmail.read ? "Marquer comme non lu" : "Marquer comme lu"}
                >
                  {selectedEmail.read ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <MailOpen className="h-4 w-4 text-blue-600" />
                  )}
                </button>

                <button
                  onClick={() => handleToggleStar(selectedEmail)}
                  className={`p-2 rounded-lg transition-colors ${
                    selectedEmail.starred
                      ? "text-amber-500 bg-amber-50"
                      : "text-slate-500 hover:text-amber-500 hover:bg-amber-50"
                  }`}
                  title="Marquer comme important"
                >
                  <Star className={`h-4 w-4 ${selectedEmail.starred ? "fill-amber-400" : ""}`} />
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => handlePrintEmail(selectedEmail)}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Imprimer l'e-mail"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>

              {/* Contenu du mail */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto p-8 lg:p-10">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight break-words">
                      {selectedEmail.subject}
                    </h1>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 flex-shrink-0">
                      {selectedEmail.folder === "inbox"
                        ? "Boîte de réception"
                        : selectedEmail.folder === "sent"
                        ? "Envoyé"
                        : selectedEmail.folder}
                    </span>
                  </div>

                  {/* En-tête Expéditeur / Destinataires */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 mb-8 border-b border-slate-100">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
                        {(selectedEmail.sender || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <p className="font-bold text-slate-900 text-base">
                            {selectedEmail.sender}
                          </p>
                          <p className="text-sm text-slate-500">&lt;{selectedEmail.email}&gt;</p>
                        </div>
                        <p className="text-xs text-slate-500">
                          <span className="font-medium text-slate-600">À :</span>{" "}
                          {selectedEmail.to || userEmail}
                        </p>
                        {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                          <p className="text-xs text-slate-500">
                            <span className="font-medium text-slate-600">Cc :</span>{" "}
                            {selectedEmail.cc.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 self-start">
                      {selectedEmail.fullDate || selectedEmail.date}
                    </div>
                  </div>

                  {/* Corps de l'e-mail */}
                  {isLoadingEmailBody ? (
                    <div className="flex items-center gap-3 py-12 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <span className="text-sm">Chargement du contenu complet du message...</span>
                    </div>
                  ) : selectedEmail.body_html ? (
                    <div
                      className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-[15px] break-words overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                    />
                  ) : (
                    <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap text-[15px] break-words">
                      {selectedEmail.body_text || selectedEmail.body || "(Ce message ne contient pas de texte)"}
                    </div>
                  )}

                  {/* Section Pièces Jointes (si disponibles) */}
                  {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                    <div className="mt-10 pt-6 border-t border-slate-200/80">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-blue-600" />
                        Pièces jointes ({selectedEmail.attachments.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedEmail.attachments.map((att, index) => {
                          const isImage = att.content_type?.startsWith("image/");
                          return (
                            <div
                              key={att.id || index}
                              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-blue-300 hover:shadow-sm transition-all group"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-3">
                                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
                                  {isImage ? (
                                    <ImageIcon className="h-5 w-5" />
                                  ) : (
                                    <File className="h-5 w-5" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {att.filename}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {formatFileSize(att.size)}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDownloadAttachment(att, selectedEmail)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors flex-shrink-0 shadow-sm"
                                title={`Télécharger ${att.filename}`}
                              >
                                <Download className="h-3.5 w-3.5" />
                                Télécharger
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions Rapides en bas du mail */}
                  <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap gap-3">
                    <button
                      onClick={() => handleReply(selectedEmail)}
                      className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20"
                    >
                      <Reply className="h-4 w-4 mr-2" /> Répondre
                    </button>
                    <button
                      onClick={() => handleReplyAll(selectedEmail)}
                      className="flex items-center px-5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
                    >
                      <ReplyAll className="h-4 w-4 mr-2 text-slate-500" /> Répondre à tous
                    </button>
                    <button
                      onClick={() => handleForward(selectedEmail)}
                      className="flex items-center px-5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
                    >
                      <Forward className="h-4 w-4 mr-2 text-slate-500" /> Transférer
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
              <div className="h-20 w-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-5">
                <Mail className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Aucun message sélectionné</h3>
              <p className="text-slate-500 text-sm mt-1">
                Cliquez sur un e-mail dans la liste pour l&apos;ouvrir et le lire.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* COMPOSER (OVERLAY) */}
      {isComposing && (
        <div className="fixed inset-0 z-50 flex items-end justify-end sm:p-6 sm:pr-8 pointer-events-none">
          <div className="pointer-events-auto w-full sm:w-[640px] h-full sm:h-[620px] bg-white sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-200 ease-out">
            {/* Composer Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center">
              <span className="font-semibold text-sm tracking-wide truncate pr-4">
                {composerTitle}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsComposing(false);
                    setSentSuccess(false);
                    setShowCcBcc(false);
                  }}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  title="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {sentSuccess ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-white">
                <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mb-5 border-4 border-emerald-100/50 animate-in zoom-in duration-300">
                  <CheckCircle className="h-10 w-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Message envoyé !</h3>
                <p className="text-slate-500 text-sm">Votre communication a bien été transmise.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col flex-1 overflow-y-auto">
                  <div className="flex px-5 py-2.5 border-b border-slate-100 items-center bg-slate-50/40 text-xs text-slate-500">
                    <span className="font-medium w-10">De</span>
                    <span className="font-semibold text-slate-700">{userEmail}</span>
                  </div>

                  <div className="flex px-5 py-3 border-b border-slate-100 items-center focus-within:bg-blue-50/30 transition-colors">
                    <span className="text-sm font-medium text-slate-500 mr-2 w-8">À</span>
                    <input
                      ref={composeToInputRef}
                      type="text"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      placeholder="destinataires (séparés par des virgules)"
                      className="flex-1 focus:outline-none text-sm bg-transparent placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCcBcc(!showCcBcc)}
                      className={`text-xs font-semibold ml-2 uppercase tracking-wider px-2 py-1 rounded ${
                        showCcBcc
                          ? "bg-blue-100 text-blue-700"
                          : "text-slate-400 hover:text-blue-600"
                      }`}
                    >
                      Cc / Cci
                    </button>
                  </div>

                  {showCcBcc && (
                    <div className="animate-in slide-in-from-top-2 duration-150">
                      <div className="flex px-5 py-2.5 border-b border-slate-100 items-center bg-slate-50/50 focus-within:bg-blue-50/30 transition-colors">
                        <span className="text-sm font-medium text-slate-500 mr-2 w-8">Cc</span>
                        <input
                          type="text"
                          value={composeCc}
                          onChange={(e) => setComposeCc(e.target.value)}
                          placeholder="Destinataires en copie (séparés par des virgules)"
                          className="flex-1 focus:outline-none text-sm bg-transparent"
                        />
                      </div>
                      <div className="flex px-5 py-2.5 border-b border-slate-100 items-center bg-slate-50/50 focus-within:bg-blue-50/30 transition-colors">
                        <span className="text-sm font-medium text-slate-500 mr-2 w-8">Cci</span>
                        <input
                          type="text"
                          value={composeBcc}
                          onChange={(e) => setComposeBcc(e.target.value)}
                          placeholder="Destinataires en copie cachée"
                          className="flex-1 focus:outline-none text-sm bg-transparent"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex px-5 py-3 border-b border-slate-100 items-center focus-within:bg-blue-50/30 transition-colors">
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="Objet du message"
                      className="flex-1 focus:outline-none text-sm font-semibold placeholder-slate-400 bg-transparent text-slate-900"
                    />
                  </div>

                  <textarea
                    ref={composeTextareaRef}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Rédigez votre message ici..."
                    className="flex-1 p-5 focus:outline-none resize-none text-sm text-slate-800 leading-relaxed bg-transparent min-h-[200px]"
                  />

                  {/* Liste des fichiers joints avant envoi */}
                  {composeAttachments.length > 0 && (
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 space-y-2">
                      <p className="text-xs font-semibold text-slate-500">
                        Pièces jointes ({composeAttachments.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {composeAttachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-sm"
                          >
                            <Paperclip className="h-3.5 w-3.5 text-blue-600" />
                            <span className="truncate max-w-[180px]">{att.filename}</span>
                            <span className="text-slate-400">({formatFileSize(att.size)})</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveComposeAttachment(idx)}
                              className="text-slate-400 hover:text-red-600 ml-1"
                              title="Retirer ce fichier"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Composer Footer */}
                <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSendEmail}
                      disabled={isSending}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center shadow-md shadow-blue-500/20 disabled:opacity-70"
                    >
                      {isSending ? "Envoi..." : "Envoyer"}
                      <Send className={`h-4 w-4 ml-2 ${isSending ? "animate-pulse" : ""}`} />
                    </button>

                    <label
                      className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-medium"
                      title="Joindre un ou plusieurs fichiers"
                    >
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Paperclip className="h-5 w-5" />
                    </label>

                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={isSavingDraft}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5"
                      title="Enregistrer dans les brouillons"
                    >
                      <Save className="h-4 w-4 text-slate-400" />
                      Brouillon
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setIsComposing(false);
                      setShowCcBcc(false);
                      setEditingDraftId(null);
                      setComposeAttachments([]);
                    }}
                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Annuler et fermer"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Global CSS for scrollbar */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `,
        }}
      />
    </div>
  );
}
