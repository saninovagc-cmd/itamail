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
  Save,
  Settings,
  ChevronDown,
  ChevronUp,
  Palette
} from "lucide-react";
import Link from "next/link";
import { 
  getMailSettings, 
  saveMailSettingsToStorage, 
  DEFAULT_MAIL_SETTINGS, 
  AVAILABLE_FONTS, 
  AVAILABLE_FONT_SIZES, 
  AVAILABLE_COLORS, 
  type MailSettings 
} from "../dashboard/parametres/page";

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
  created_at?: string;
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

function normalizeSubject(subj: string | null | undefined): string {
  if (!subj) return "";
  return subj
    .replace(/^(\s*(re|fwd|fw|tr)\s*:\s*)+/gi, "")
    .trim()
    .toLowerCase();
}

function sanitizeHtmlForDisplay(html: string | null | undefined): string {
  if (!html) return "";
  // Nettoyer les scripts et les attributs dangereux mais conserver l'intégralité des styles, tables, polices et couleurs
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
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
  const [composeToTags, setComposeToTags] = useState<string[]>([]);
  const [composeCcTags, setComposeCcTags] = useState<string[]>([]);
  const [composeBccTags, setComposeBccTags] = useState<string[]>([]);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeAttachments, setComposeAttachments] = useState<ComposeAttachment[]>([]);

  // Paramètres utilisateur
  const [mailSettings, setMailSettings] = useState<MailSettings>(DEFAULT_MAIL_SETTINGS);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Vue Chronologie / Dépliage des échanges
  const [expandedThreadIds, setExpandedThreadIds] = useState<Record<string | number, boolean>>({});

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
      created_at: m.created_at,
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
      const userSettings = getMailSettings(savedEmail);
      setMailSettings(userSettings);
      fetchMessages(savedEmail);
    }
  }, []);

  // Ouvrir un e-mail, le marquer comme lu et récupérer son contenu complet / pièces jointes si besoin
  const handleSelectEmail = async (email: EmailItem) => {
    // Si c'est un brouillon, on l'ouvre dans l'éditeur
    if (email.folder === "drafts") {
      setEditingDraftId(email.id);
      setComposerTitle("Modifier le brouillon");
      setComposeTo("");
      setComposeToTags(email.to ? email.to.split(",").map((s) => s.trim()).filter(Boolean) : []);
      setComposeCc("");
      setComposeCcTags(email.cc || []);
      setComposeBcc("");
      setComposeBccTags([]);
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
    setComposeToTags([]);
    setComposeCcTags([]);
    setComposeBccTags([]);
    setComposeSubject("");
    const defaultSig = mailSettings.signature ? `\n\n${mailSettings.signature}` : "";
    setComposeBody(defaultSig);
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

    const defaultSig = mailSettings.signature ? `\n\n${mailSettings.signature}` : "";

    setComposerTitle(`Répondre à ${email.sender}`);
    setComposeTo("");
    setComposeToTags(replyTarget ? [replyTarget] : []);
    setComposeCc("");
    setComposeBcc("");
    setComposeCcTags([]);
    setComposeBccTags([]);
    setShowCcBcc(false);
    setComposeSubject(`Re: ${cleanSubj}`);
    setComposeBody(
      `${defaultSig}\n\n---\nLe ${email.fullDate || email.date}, ${email.sender} <${email.email}> a écrit :\n${quotedText}`
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
      ...(email.to_all || (email.to ? email.to.split(",").map((s) => s.trim()) : [])),
      ...(email.cc || []),
    ];

    const primaryLower = (primaryRecipient || "").toLowerCase().trim();
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

    const defaultSig = mailSettings.signature ? `\n\n${mailSettings.signature}` : "";

    setComposerTitle(`Répondre à tous`);
    setComposeTo("");
    setComposeToTags(primaryRecipient ? [primaryRecipient] : []);
    setComposeCc("");
    setComposeBcc("");
    setComposeCcTags(uniqueCc);
    setComposeBccTags([]);
    setShowCcBcc(uniqueCc.length > 0);
    setComposeSubject(`Re: ${cleanSubj}`);
    setComposeBody(
      `${defaultSig}\n\n---\nLe ${email.fullDate || email.date}, ${email.sender} <${email.email}> a écrit :\n${quotedText}`
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

    const defaultSig = mailSettings.signature ? `\n\n${mailSettings.signature}` : "";

    setComposerTitle("Transférer le message");
    setComposeTo("");
    setComposeToTags([]);
    setComposeCc("");
    setComposeCcTags([]);
    setComposeBcc("");
    setComposeBccTags([]);
    setShowCcBcc(false);
    setComposeSubject(`Tr: ${cleanSubj}`);
    setComposeBody(`${defaultSig}${forwardHeader}`);
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
    const finalTo = [
      ...composeToTags,
      ...(composeTo.trim() ? [composeTo.trim()] : [])
    ].join(", ");

    const finalCcList = [
      ...composeCcTags,
      ...(composeCc.trim() ? [composeCc.trim()] : [])
    ];

    if (!finalTo && !composeSubject && !composeBody) {
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
          cc: finalCcList,
          attachments: [],
        };
        const htmlWithMeta = buildHtmlWithMeta("", metaPayload);

        if (editingDraftId) {
          await supabase
            .from("messages")
            .update({
              recipient_email: finalTo || "",
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
            recipient_email: finalTo || "",
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
    // 1. Rassembler tous les destinataires (tags validés + saisie en cours)
    const allTo = [
      ...composeToTags,
      ...(composeTo.trim() ? [composeTo.trim()] : [])
    ];

    const allCc = [
      ...composeCcTags,
      ...(composeCc.trim() ? [composeCc.trim()] : [])
    ];

    const allBcc = [
      ...composeBccTags,
      ...(composeBcc.trim() ? [composeBcc.trim()] : [])
    ];

    if (allTo.length === 0 || !composeSubject.trim() || !composeBody.trim()) {
      alert("Veuillez renseigner au moins un destinataire, un objet et un corps de message.");
      return;
    }

    setIsSending(true);

    try {
      // 2. Générer le HTML mis en forme selon les paramètres (police, taille, couleur)
      const formattedHtml = `
        <div style="font-family: ${mailSettings.fontFamily}; font-size: ${mailSettings.fontSize}; color: ${mailSettings.textColor}; line-height: 1.6; white-space: pre-wrap;">
${composeBody}
        </div>
      `.trim();

      const response = await fetch("/api/webmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: userEmail,
          to: allTo.join(", "),
          cc: showCcBcc && allCc.length > 0 ? allCc.join(", ") : undefined,
          bcc: showCcBcc && allBcc.length > 0 ? allBcc.join(", ") : undefined,
          subject: composeSubject,
          text: composeBody,
          html: formattedHtml,
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
            to: allTo.join(", "),
            to_all: allTo,
            cc: allCc,
            subject: composeSubject,
            preview: composeBody.substring(0, 80) + "...",
            date: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
            fullDate: formatFullDate(new Date().toISOString()),
            created_at: new Date().toISOString(),
            read: true,
            folder: "sent",
            body: composeBody,
            body_text: composeBody,
            body_html: formattedHtml,
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
        setComposeToTags([]);
        setComposeCcTags([]);
        setComposeBccTags([]);
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-100/80 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
            title="Paramètres d'affichage, police, couleur et signature"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Paramètres</span>
          </button>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">{userEmail}</p>
            <p className="text-xs font-medium text-emerald-500 flex items-center justify-end">
              Connecté
            </p>
          </div>
          <div 
            onClick={() => setShowSettingsModal(true)}
            title="Ouvrir les paramètres"
            className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer shadow-md ring-2 ring-white hover:scale-105 transition-transform"
          >
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

          <div className="mt-auto pt-4 border-t border-slate-200/60 space-y-1">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Settings className="h-4 w-4 mr-3 text-slate-400" /> Paramètres
            </button>
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

                  {/* Corps de l'e-mail avec rendu fidèle */}
                  {isLoadingEmailBody ? (
                    <div className="flex items-center gap-3 py-12 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <span className="text-sm">Chargement du contenu complet du message...</span>
                    </div>
                  ) : selectedEmail.body_html ? (
                    <div
                      className="ita-mail-content border border-slate-100 rounded-xl p-5 bg-white shadow-sm leading-relaxed text-[15px] break-words overflow-x-auto"
                      style={{
                        fontFamily: mailSettings.fontFamily,
                        fontSize: mailSettings.fontSize,
                        color: mailSettings.textColor,
                      }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDisplay(selectedEmail.body_html) }}
                    />
                  ) : (
                    <div 
                      className="ita-mail-content border border-slate-100 rounded-xl p-5 bg-white shadow-sm leading-relaxed whitespace-pre-wrap text-[15px] break-words"
                      style={{
                        fontFamily: mailSettings.fontFamily,
                        fontSize: mailSettings.fontSize,
                        color: mailSettings.textColor,
                      }}
                    >
                      {selectedEmail.body_text || selectedEmail.body || "(Ce message ne contient pas de texte)"}
                    </div>
                  )}

                  {/* Section Chronologie des échanges (Discussion suivie) */}
                  {(() => {
                    const cleanSubj = normalizeSubject(selectedEmail.subject);
                    if (!cleanSubj || cleanSubj === "(sans objet)") return null;

                    // Tous les messages partageant le même objet
                    const related = emails.filter((e) => {
                      return normalizeSubject(e.subject) === cleanSubj;
                    }).sort((a, b) => {
                      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                      return dateA - dateB;
                    });

                    if (related.length <= 1) return null;

                    return (
                      <div className="mt-10 pt-6 border-t border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                            <RotateCcw className="h-4 w-4 text-blue-600" />
                            Chronologie de la discussion ({related.length} échanges)
                          </h3>
                          <span className="text-xs text-slate-400">
                            Par ordre chronologique
                          </span>
                        </div>

                        <div className="space-y-3">
                          {related.map((msg, index) => {
                            const isCurrent = msg.id === selectedEmail.id;
                            const isExpanded = isCurrent || Boolean(expandedThreadIds[msg.id]);

                            return (
                              <div
                                key={msg.id}
                                className={`rounded-xl border transition-all overflow-hidden ${
                                  isCurrent
                                    ? "border-blue-300 bg-blue-50/30 ring-2 ring-blue-500/10"
                                    : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                {/* Barre d'en-tête de l'échange */}
                                <div
                                  onClick={() => {
                                    if (!isCurrent) {
                                      setExpandedThreadIds((prev) => ({
                                        ...prev,
                                        [msg.id]: !prev[msg.id],
                                      }));
                                    }
                                  }}
                                  className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-3 min-w-0 pr-4">
                                    <div
                                      className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0 ${
                                        msg.folder === "sent"
                                          ? "bg-slate-700"
                                          : "bg-blue-600"
                                      }`}
                                    >
                                      {(msg.sender || "M").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-2">
                                        <span>{msg.sender}</span>
                                        <span className="text-[11px] font-normal text-slate-400">
                                          &lt;{msg.email}&gt;
                                        </span>
                                        {msg.folder === "sent" && (
                                          <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                            Envoyé par vous
                                          </span>
                                        )}
                                        {isCurrent && (
                                          <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                                            Message ouvert
                                          </span>
                                        )}
                                      </p>
                                      {!isExpanded && (
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                          {msg.preview}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-[11px] font-medium text-slate-400">
                                      {msg.fullDate || msg.date}
                                    </span>
                                    {!isCurrent && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectEmail(msg);
                                        }}
                                        className="text-[11px] font-bold text-blue-600 hover:underline px-2 py-1 rounded bg-white border border-slate-200"
                                      >
                                        Ouvrir
                                      </button>
                                    )}
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-slate-400" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-slate-400" />
                                    )}
                                  </div>
                                </div>

                                {/* Contenu déplié du message dans le fil */}
                                {isExpanded && !isCurrent && (
                                  <div className="p-4 pt-2 border-t border-slate-200/80 bg-white">
                                    <div className="text-xs text-slate-500 mb-2 pb-2 border-b border-slate-100 flex justify-between">
                                      <span><strong>À :</strong> {msg.to}</span>
                                      {msg.cc && msg.cc.length > 0 && <span><strong>Cc :</strong> {msg.cc.join(", ")}</span>}
                                    </div>
                                    {msg.body_html ? (
                                      <div
                                        className="text-xs text-slate-800 leading-relaxed overflow-x-auto max-h-[300px]"
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDisplay(msg.body_html) }}
                                      />
                                    ) : (
                                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                                        {msg.body_text || msg.body}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

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

                  {/* Champ À avec tags/badges sur espace ou virgule */}
                  <div className="flex flex-wrap px-5 py-2.5 border-b border-slate-100 items-center gap-1.5 focus-within:bg-blue-50/20 transition-colors">
                    <span className="text-sm font-medium text-slate-500 mr-2 w-6">À</span>
                    {composeToTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100/80 text-blue-800 rounded-full text-xs font-semibold animate-in zoom-in-95 duration-100"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setComposeToTags((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-blue-500 hover:text-blue-900 rounded-full hover:bg-blue-200/60 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      ref={composeToInputRef}
                      type="text"
                      value={composeTo}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.endsWith(" ") || val.endsWith(",")) {
                          const clean = val.replace(/[,\s]+$/, "").trim();
                          if (clean) {
                            setComposeToTags((prev) => [...prev, clean]);
                            setComposeTo("");
                            return;
                          }
                        }
                        setComposeTo(val);
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " " || e.key === ",") && composeTo.trim()) {
                          e.preventDefault();
                          const clean = composeTo.replace(/[,\s]+$/, "").trim();
                          if (clean) {
                            setComposeToTags((prev) => [...prev, clean]);
                            setComposeTo("");
                          }
                        } else if (e.key === "Backspace" && !composeTo && composeToTags.length > 0) {
                          setComposeToTags((prev) => prev.slice(0, -1));
                        }
                      }}
                      placeholder={composeToTags.length === 0 ? "Écrivez une adresse puis espace ou Entrée" : "Ajouter..."}
                      className="flex-1 min-w-[160px] focus:outline-none text-sm bg-transparent placeholder-slate-400 py-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCcBcc(!showCcBcc)}
                      className={`text-xs font-semibold ml-auto uppercase tracking-wider px-2 py-1 rounded ${
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
                      {/* Champ Cc avec tags */}
                      <div className="flex flex-wrap px-5 py-2 border-b border-slate-100 items-center gap-1.5 bg-slate-50/50 focus-within:bg-blue-50/20 transition-colors">
                        <span className="text-sm font-medium text-slate-500 mr-2 w-6">Cc</span>
                        {composeCcTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-200 text-slate-800 rounded-full text-xs font-semibold"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => setComposeCcTags((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-slate-500 hover:text-slate-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={composeCc}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.endsWith(" ") || val.endsWith(",")) {
                              const clean = val.replace(/[,\s]+$/, "").trim();
                              if (clean) {
                                setComposeCcTags((prev) => [...prev, clean]);
                                setComposeCc("");
                                return;
                              }
                            }
                            setComposeCc(val);
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === " " || e.key === ",") && composeCc.trim()) {
                              e.preventDefault();
                              const clean = composeCc.replace(/[,\s]+$/, "").trim();
                              if (clean) {
                                setComposeCcTags((prev) => [...prev, clean]);
                                setComposeCc("");
                              }
                            } else if (e.key === "Backspace" && !composeCc && composeCcTags.length > 0) {
                              setComposeCcTags((prev) => prev.slice(0, -1));
                            }
                          }}
                          placeholder={composeCcTags.length === 0 ? "Destinataires en copie (espace pour valider)" : "Ajouter Cc..."}
                          className="flex-1 min-w-[140px] focus:outline-none text-sm bg-transparent placeholder-slate-400 py-1"
                        />
                      </div>

                      {/* Champ Cci avec tags */}
                      <div className="flex flex-wrap px-5 py-2 border-b border-slate-100 items-center gap-1.5 bg-slate-50/50 focus-within:bg-blue-50/20 transition-colors">
                        <span className="text-sm font-medium text-slate-500 mr-2 w-6">Cci</span>
                        {composeBccTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-200 text-slate-800 rounded-full text-xs font-semibold"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => setComposeBccTags((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-slate-500 hover:text-slate-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={composeBcc}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.endsWith(" ") || val.endsWith(",")) {
                              const clean = val.replace(/[,\s]+$/, "").trim();
                              if (clean) {
                                setComposeBccTags((prev) => [...prev, clean]);
                                setComposeBcc("");
                                return;
                              }
                            }
                            setComposeBcc(val);
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === " " || e.key === ",") && composeBcc.trim()) {
                              e.preventDefault();
                              const clean = composeBcc.replace(/[,\s]+$/, "").trim();
                              if (clean) {
                                setComposeBccTags((prev) => [...prev, clean]);
                                setComposeBcc("");
                              }
                            } else if (e.key === "Backspace" && !composeBcc && composeBccTags.length > 0) {
                              setComposeBccTags((prev) => prev.slice(0, -1));
                            }
                          }}
                          placeholder={composeBccTags.length === 0 ? "Destinataires en copie cachée" : "Ajouter Cci..."}
                          className="flex-1 min-w-[140px] focus:outline-none text-sm bg-transparent placeholder-slate-400 py-1"
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

                  {/* Barre de style & préférences typographiques (Police, Taille, Couleur, Signature) */}
                  <div className="flex flex-wrap items-center gap-2 px-5 py-2 bg-slate-50/70 border-b border-slate-100 text-xs">
                    {/* Police */}
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">Police:</span>
                      <select
                        value={mailSettings.fontFamily}
                        onChange={(e) => {
                          const updated = { ...mailSettings, fontFamily: e.target.value };
                          setMailSettings(updated);
                          saveMailSettingsToStorage(updated, userEmail);
                        }}
                        className="p-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                      >
                        {AVAILABLE_FONTS.map((f) => (
                          <option key={f.value} value={f.value}>{f.label.split(" (")[0]}</option>
                        ))}
                      </select>
                    </div>

                    {/* Taille */}
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-medium">Taille:</span>
                      <select
                        value={mailSettings.fontSize}
                        onChange={(e) => {
                          const updated = { ...mailSettings, fontSize: e.target.value };
                          setMailSettings(updated);
                          saveMailSettingsToStorage(updated, userEmail);
                        }}
                        className="p-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                      >
                        {AVAILABLE_FONT_SIZES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Couleur */}
                    <div className="flex items-center gap-1.5 ml-1">
                      <span className="text-slate-400 font-medium">Couleur:</span>
                      <input
                        type="color"
                        value={mailSettings.textColor}
                        onChange={(e) => {
                          const updated = { ...mailSettings, textColor: e.target.value };
                          setMailSettings(updated);
                          saveMailSettingsToStorage(updated, userEmail);
                        }}
                        className="h-6 w-6 rounded cursor-pointer border border-slate-200 p-0 bg-transparent"
                        title="Couleur du texte"
                      />
                    </div>

                    {/* Insérer la signature */}
                    {mailSettings.signature && (
                      <button
                        type="button"
                        onClick={() => {
                          setComposeBody((prev) => `${prev}\n\n${mailSettings.signature}`);
                        }}
                        className="ml-auto text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                        title="Insérer ma signature configurée"
                      >
                        + Insérer signature
                      </button>
                    )}
                  </div>

                  <textarea
                    ref={composeTextareaRef}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    style={{
                      fontFamily: mailSettings.fontFamily,
                      fontSize: mailSettings.fontSize,
                      color: mailSettings.textColor,
                    }}
                    placeholder="Rédigez votre message ici..."
                    className="flex-1 p-5 focus:outline-none resize-none text-sm leading-relaxed bg-transparent min-h-[220px]"
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

      {/* MODALE PARAMÈTRES DU WEBMAIL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Settings className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-base">Paramètres du Webmail</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {/* Signature */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Signature d'e-mail
                </label>
                <p className="text-xs text-slate-500">
                  Cette signature sera automatiquement insérée au bas de vos nouveaux e-mails et réponses.
                </p>
                <textarea
                  value={mailSettings.signature}
                  onChange={(e) => setMailSettings({ ...mailSettings, signature: e.target.value })}
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-500"
                  placeholder="Ex: Cordialement, Jean Dupont..."
                />
              </div>

              {/* Typographie & Couleurs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Police par défaut
                  </label>
                  <select
                    value={mailSettings.fontFamily}
                    onChange={(e) => setMailSettings({ ...mailSettings, fontFamily: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    {AVAILABLE_FONTS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                    Taille du texte
                  </label>
                  <select
                    value={mailSettings.fontSize}
                    onChange={(e) => setMailSettings({ ...mailSettings, fontSize: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    {AVAILABLE_FONT_SIZES.map((sz) => (
                      <option key={sz.value} value={sz.value}>
                        {sz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Couleur */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  Couleur du texte
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setMailSettings({ ...mailSettings, textColor: c.value })}
                      className={`h-7 w-7 rounded-full border-2 transition-transform flex items-center justify-center ${
                        mailSettings.textColor === c.value
                          ? "scale-110 border-blue-600 shadow-sm"
                          : "border-white hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                  <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                    <input
                      type="color"
                      value={mailSettings.textColor}
                      onChange={(e) => setMailSettings({ ...mailSettings, textColor: e.target.value })}
                      className="h-7 w-7 rounded-lg cursor-pointer border border-slate-200 p-0"
                    />
                    <span className="text-xs font-mono text-slate-500">{mailSettings.textColor}</span>
                  </div>
                </div>
              </div>

              {/* Aperçu en direct */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Aperçu du rendu
                </span>
                <div
                  style={{
                    fontFamily: mailSettings.fontFamily,
                    fontSize: mailSettings.fontSize,
                    color: mailSettings.textColor,
                    lineHeight: "1.6",
                  }}
                  className="whitespace-pre-wrap break-words bg-white p-3 rounded-lg border border-slate-200"
                >
                  Bonjour,<br />
                  Ceci est un exemple montrant exactement l'apparence de vos courriels avec vos préférences.<br />
                  {mailSettings.signature}
                </div>
              </div>
            </div>

            <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMailSettings(DEFAULT_MAIL_SETTINGS);
                  saveMailSettingsToStorage(DEFAULT_MAIL_SETTINGS, userEmail);
                  showToast("Paramètres réinitialisés par défaut");
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Réinitialiser par défaut
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveMailSettingsToStorage(mailSettings, userEmail);
                    setShowSettingsModal(false);
                    showToast("Paramètres enregistrés avec succès");
                  }}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm"
                >
                  Enregistrer
                </button>
              </div>
            </div>
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
