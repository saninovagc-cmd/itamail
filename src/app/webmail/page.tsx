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
  Palette,
  Menu,
  MoreVertical,
  Check,
  Maximize2,
  Minimize2,
  Minus,
  SlidersHorizontal,
  ArrowLeft,
  ShieldCheck,
  Eye,
  Info,
  ExternalLink
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

function getAvatarColor(identifier: string): string {
  const colors = [
    "bg-red-500 text-white",
    "bg-blue-600 text-white",
    "bg-emerald-600 text-white",
    "bg-amber-600 text-white",
    "bg-purple-600 text-white",
    "bg-teal-600 text-white",
    "bg-indigo-600 text-white",
    "bg-pink-600 text-white",
  ];
  if (!identifier) return colors[0];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function WebmailPage() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [mailboxId, setMailboxId] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [activeTabFilter, setActiveTabFilter] = useState<"all" | "unread" | "starred">("all");
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [isLoadingEmailBody, setIsLoadingEmailBody] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingContent, setIsSyncingContent] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [composerMinimized, setComposerMinimized] = useState(false);
  const [composerMaximized, setComposerMaximized] = useState(false);
  const [composerTitle, setComposerTitle] = useState("Nouveau message");
  const [editingDraftId, setEditingDraftId] = useState<string | number | null>(null);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showEmailDetailsModal, setShowEmailDetailsModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

          // Détecter s'il y a des e-mails en boîte de réception sans corps et lancer la synchronisation automatique
          const hasEmptyInbox = formattedMsgs.some(
            (m) => m.folder === "inbox" && !m.body_text && !m.body_html
          );
          if (hasEmptyInbox && !silent) {
            fetch(`/api/webmail/sync?email=${encodeURIComponent(savedEmail)}`, { method: "POST" })
              .then((r) => r.json())
              .then((syncRes) => {
                if (syncRes.synced_total > 0) {
                  fetchMessages(savedEmail, true);
                }
              })
              .catch((err) => console.warn("Auto-sync background err:", err));
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

  // Forcer la synchronisation manuelle d'un message spécifique avec Resend
  const handleForceSyncEmail = async (email: EmailItem) => {
    try {
      setIsSyncingContent(true);
      showToast("Synchronisation du message avec le serveur...");
      const res = await fetch(`/api/webmail/sync?messageId=${encodeURIComponent(email.id)}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.synced_total > 0) {
        showToast("Contenu intégral récupéré avec succès !");
        const savedEmail = userEmail || localStorage.getItem("webmail_user");
        if (savedEmail) {
          await fetchMessages(savedEmail, true);
        }
      } else if (data.results?.[0]?.status === "failed") {
        const errDetail = data.results[0].email_error || `Status HTTP ${data.results[0].email_status}`;
        showToast(`Erreur serveur Resend: ${errDetail}`);
      } else {
        showToast("Synchronisation terminée.");
        const savedEmail = userEmail || localStorage.getItem("webmail_user");
        if (savedEmail) {
          await fetchMessages(savedEmail, true);
        }
      }
    } catch (e: any) {
      console.error("Erreur force sync:", e);
      showToast("Erreur lors de la synchronisation.");
    } finally {
      setIsSyncingContent(false);
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
  const starredCount = emails.filter((e) => e.starred).length;
  const draftsCount = emails.filter((e) => e.folder === "drafts").length;
  const spamsCount = emails.filter((e) => e.folder === "spams" && !e.read).length;

  const filteredEmails = emails.filter((e) => {
    if (activeFolder === "starred") {
      if (!e.starred) return false;
    } else if (e.folder !== activeFolder) {
      return false;
    }

    if (activeTabFilter === "unread" && e.read) return false;
    if (activeTabFilter === "starred" && !e.starred) return false;

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
    <div className="h-screen flex flex-col bg-[#f6f8fc] overflow-hidden font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900">
      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#202124] text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200 border border-slate-700">
          <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER GMAIL STYLE */}
      <header className="h-16 bg-[#f6f8fc] px-4 flex items-center justify-between flex-shrink-0 z-20">
        {/* Brand & Menu */}
        <div className="flex items-center gap-2 w-64">
          <button 
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2.5 rounded-full text-slate-600 hover:bg-slate-200/70 transition-colors"
            title="Menu principal"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div 
            onClick={() => { setActiveFolder("inbox"); setSelectedEmail(null); }}
            className="flex items-center gap-2.5 pl-1 cursor-pointer select-none"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-xs">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-bold tracking-tight text-[#1f1f1f]">ITA</span>
              <span className="text-xl font-medium tracking-tight text-[#5f6368] ml-1">Mail</span>
            </div>
          </div>
        </div>

        {/* Floating Google Search Bar */}
        <div className="flex-1 max-w-2xl mx-4">
          <div className="relative flex items-center bg-[#eaf1fb] hover:bg-[#e1eaf5] focus-within:bg-white focus-within:shadow-md focus-within:ring-1 focus-within:ring-blue-200 rounded-full h-12 px-4 transition-all duration-200">
            <Search className="h-5 w-5 text-slate-500 mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Rechercher dans les messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-[#1f1f1f] placeholder:text-slate-500 outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60"
                title="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <SlidersHorizontal className="h-4 w-4 text-slate-400 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => userEmail && fetchMessages(userEmail)}
            className="p-2.5 rounded-full text-slate-600 hover:bg-slate-200/70 transition-colors"
            title="Actualiser les messages"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-2.5 rounded-full text-slate-600 hover:bg-slate-200/70 transition-colors"
            title="Paramètres d'affichage, police et signature"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* Profile Avatar with Dropdown */}
          <div className="relative ml-1">
            <div
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              title={userEmail}
              className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm text-white cursor-pointer shadow-xs ring-2 ring-white hover:ring-blue-400 transition-all ${getAvatarColor(userEmail)}`}
            >
              {userEmail.charAt(0).toUpperCase()}
            </div>

            {showAccountDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowAccountDropdown(false)} 
                />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-lg text-white ${getAvatarColor(userEmail)}`}>
                      {userEmail.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{userEmail}</p>
                      <p className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connecté
                      </p>
                    </div>
                  </div>
                  <div className="py-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountDropdown(false);
                        setShowSettingsModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-slate-500" />
                      Paramètres du compte & Webmail
                    </button>
                    <Link
                      href="/dashboard"
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 text-slate-500" />
                      Accéder au Tableau de bord
                    </Link>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Se déconnecter
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* WORKSPACE GMAIL */}
      <div className="flex-1 flex overflow-hidden bg-[#f6f8fc]">
        {/* SIDEBAR GMAIL */}
        <div className={`${sidebarCollapsed ? "w-20 items-center" : "w-64"} bg-[#f6f8fc] flex flex-col p-3 transition-all duration-200 z-10 flex-shrink-0`}>
          {/* Nouveau message - Iconic Gmail Floating Pill */}
          <button
            onClick={handleOpenNewCompose}
            className={`flex items-center gap-3.5 bg-[#c2e7ff] hover:bg-[#b3d7ef] text-[#001d35] font-semibold text-sm rounded-2xl shadow-xs hover:shadow-md active:scale-95 transition-all mb-4 ${
              sidebarCollapsed ? "p-3.5 justify-center" : "px-6 py-4"
            }`}
            title="Nouveau message"
          >
            <PenSquare className="h-5 w-5 text-[#001d35]" />
            {!sidebarCollapsed && <span>Nouveau message</span>}
          </button>

          {/* Navigation Dossiers Style Gmail */}
          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
            {[
              { id: "inbox", label: "Boîte de réception", icon: Inbox, count: unreadInboxCount },
              { id: "starred", label: "Messages suivis", icon: Star, count: starredCount },
              { id: "sent", label: "Envoyés", icon: Send, count: 0 },
              { id: "drafts", label: "Brouillons", icon: FileText, count: draftsCount },
              { id: "spams", label: "Spams", icon: AlertOctagon, count: spamsCount },
              { id: "trash", label: "Corbeille", icon: Trash2, count: 0 },
              { id: "folders", label: "Archives", icon: Folder, count: 0 },
            ].map((folder) => {
              const isActive = activeFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => {
                    setActiveFolder(folder.id);
                    setSelectedEmail(null);
                  }}
                  title={folder.label}
                  className={`w-full flex items-center justify-between rounded-full text-sm font-medium transition-colors ${
                    sidebarCollapsed ? "p-3 justify-center" : "px-4 py-2.5"
                  } ${
                    isActive
                      ? "bg-[#d3e3fd] text-[#041e49] font-bold"
                      : "text-[#444746] hover:bg-[#eaebef]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <folder.icon
                      className={`h-4 w-4 ${
                        isActive ? "text-[#041e49]" : "text-[#444746]"
                      } ${folder.id === "starred" && starredCount > 0 ? "fill-amber-400 text-amber-400" : ""}`}
                    />
                    {!sidebarCollapsed && <span>{folder.label}</span>}
                  </div>
                  {!sidebarCollapsed && folder.count > 0 && (
                    <span
                      className={`text-xs py-0.5 px-2 rounded-full font-bold ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200/90 text-slate-700"
                      }`}
                    >
                      {folder.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer Sidebar */}
          <div className="mt-auto pt-3 border-t border-slate-200/70 space-y-1">
            <button
              onClick={() => setShowSettingsModal(true)}
              className={`w-full flex items-center rounded-full text-xs font-semibold text-[#444746] hover:bg-[#eaebef] transition-colors ${
                sidebarCollapsed ? "p-3 justify-center" : "px-4 py-2"
              }`}
              title="Paramètres"
            >
              <Settings className="h-4 w-4 text-slate-500 mr-2.5" />
              {!sidebarCollapsed && <span>Paramètres</span>}
            </button>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors ${
                sidebarCollapsed ? "p-3 justify-center" : "px-4 py-2"
              }`}
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4 mr-2.5" />
              {!sidebarCollapsed && <span>Déconnexion</span>}
            </button>
          </div>
        </div>

        {/* CONTENEUR BLANC FLOTTANT (STYLE GOOGLE WORKSPACE) */}
        <div className="flex-1 flex mr-3 mb-3 bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          {/* LISTE DES MESSAGES (MIDDLE COLUMN) */}
          <div className={`w-full lg:w-[390px] ${selectedEmail ? "hidden lg:flex" : "flex"} border-r border-slate-200/80 flex-col flex-shrink-0 bg-white`}>
            {/* Top Toolbar Liste */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  {activeFolder === "inbox"
                    ? "Boîte de réception"
                    : activeFolder === "starred"
                    ? "Messages suivis"
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
                <span className="text-xs text-slate-400 font-medium">
                  ({filteredEmails.length})
                </span>
              </div>

              {/* Filtres rapides : Tous, Non lus, Favoris */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTabFilter("all")}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    activeTabFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabFilter("unread")}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    activeTabFilter === "unread" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Non lus
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabFilter("starred")}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    activeTabFilter === "starred" ? "bg-white text-amber-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  ★
                </button>
              </div>
            </div>

            {/* Email Rows */}
            <div className="overflow-y-auto flex-1 custom-scrollbar divide-y divide-slate-100/80">
              {filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-56 text-slate-400 px-4 text-center">
                  <div className="h-14 w-14 rounded-full bg-slate-50 flex items-center justify-center mb-3 text-slate-300">
                    <Inbox className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Aucun message</p>
                  <p className="text-xs text-slate-400 mt-0.5">Ce dossier est actuellement vide.</p>
                </div>
              ) : (
                filteredEmails.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;
                  const isUnread = !email.read;
                  return (
                    <div
                      key={email.id}
                      onClick={() => handleSelectEmail(email)}
                      className={`px-4 py-3 cursor-pointer transition-all duration-150 relative group ${
                        isSelected
                          ? "bg-[#eaf1fb] border-l-4 border-blue-600"
                          : isUnread
                          ? "bg-blue-50/25 hover:bg-slate-50/80"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Top Row : Star, Sender, Attachment, Date */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Star interactive */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleStar(email, e)}
                            className={`p-0.5 rounded-sm transition-colors ${
                              email.starred
                                ? "text-amber-400"
                                : "text-slate-300 hover:text-amber-400"
                            }`}
                            title="Suivre / Important"
                          >
                            <Star className={`h-4 w-4 ${email.starred ? "fill-amber-400" : ""}`} />
                          </button>

                          {/* Blue unread dot */}
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                          )}

                          {/* Sender Initials Avatar */}
                          <div
                            className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-2xs ${getAvatarColor(
                              email.sender || email.email
                            )}`}
                          >
                            {(email.sender || "M").charAt(0).toUpperCase()}
                          </div>

                          <h3
                            className={`text-sm truncate ${
                              isUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"
                            }`}
                          >
                            {activeFolder === "sent" || activeFolder === "drafts"
                              ? `À : ${email.to || "(Destinataire non défini)"}`
                              : email.sender}
                          </h3>
                        </div>

                        {/* Date & Attachments (hidden on hover when quick actions show) */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 group-hover:hidden">
                          {email.attachments && email.attachments.length > 0 && (
                            <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span
                            className={`text-xs font-medium ${
                              isUnread ? "text-blue-600 font-bold" : "text-slate-400"
                            }`}
                          >
                            {email.date}
                          </span>
                        </div>

                        {/* GMAIL HOVER ACTIONS : Appears on row hover */}
                        <div className="hidden group-hover:flex items-center gap-1 bg-white/95 px-1.5 py-0.5 rounded-lg shadow-xs border border-slate-200/80 z-10 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToFolder(email, "folders", "Message archivé");
                            }}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="Archiver"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToFolder(email, "trash", "Placé dans la corbeille");
                            }}
                            className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleRead(email);
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title={isUnread ? "Marquer comme lu" : "Marquer comme non lu"}
                          >
                            {isUnread ? <MailOpen className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Subject */}
                      <h4
                        className={`text-xs truncate mb-1 pl-6 ${
                          isUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"
                        }`}
                      >
                        {email.subject}
                      </h4>

                      {/* Snippet preview */}
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pl-6">
                        {email.preview}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        {/* LECTURE DU MAIL */}
        {/* LECTURE DU MAIL */}
        <div className={`flex-1 bg-white flex flex-col relative overflow-hidden ${!selectedEmail ? "hidden lg:flex" : "flex"}`}>
          {selectedEmail ? (
            <>
              {/* Toolbar complète Style Gmail */}
              <div className="h-14 border-b border-slate-200/80 flex items-center px-4 md:px-6 gap-1 bg-white sticky top-0 z-20 flex-shrink-0">
                {/* Back button (mobile / reset view) */}
                <button
                  onClick={() => {
                    setSelectedEmail(null);
                    setShowEmailDetailsModal(false);
                  }}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors mr-1"
                  title="Retour à la liste"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="w-px h-5 bg-slate-200 mx-1" />

                {/* Reply, Reply All, Forward quick buttons */}
                <button
                  onClick={() => handleReply(selectedEmail)}
                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="Répondre"
                >
                  <Reply className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleReplyAll(selectedEmail)}
                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="Répondre à tous"
                >
                  <ReplyAll className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleForward(selectedEmail)}
                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="Transférer"
                >
                  <Forward className="h-4 w-4" />
                </button>

                <div className="w-px h-5 bg-slate-200 mx-1" />

                {/* Archive */}
                {selectedEmail.folder !== "folders" && (
                  <button
                    onClick={() =>
                      handleMoveToFolder(selectedEmail, "folders", "Message archivé")
                    }
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                    title="Archiver"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                )}

                {/* Spam */}
                {selectedEmail.folder !== "spams" ? (
                  <button
                    onClick={() =>
                      handleMoveToFolder(selectedEmail, "spams", "Signalé comme spam")
                    }
                    className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
                    title="Signaler comme spam"
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
                    className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                    title="Ce n'est pas un spam (Restaurer)"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}

                {/* Trash */}
                {selectedEmail.folder !== "trash" ? (
                  <button
                    onClick={() =>
                      handleMoveToFolder(selectedEmail, "trash", "Déplacé dans la corbeille")
                    }
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Supprimer"
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
                      className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
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
                      className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
                      title="Supprimer définitivement"
                    >
                      Supprimer définitivement
                    </button>
                  </>
                )}

                <div className="w-px h-5 bg-slate-200 mx-1" />

                {/* Mark read / unread */}
                <button
                  onClick={() => handleToggleRead(selectedEmail)}
                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title={selectedEmail.read ? "Marquer comme non lu" : "Marquer comme lu"}
                >
                  {selectedEmail.read ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <MailOpen className="h-4 w-4 text-blue-600" />
                  )}
                </button>

                {/* Star toggle */}
                <button
                  onClick={() => handleToggleStar(selectedEmail)}
                  className={`p-2 rounded-full transition-colors ${
                    selectedEmail.starred
                      ? "text-amber-500 bg-amber-50"
                      : "text-slate-600 hover:text-amber-500 hover:bg-amber-50"
                  }`}
                  title="Marquer comme important"
                >
                  <Star className={`h-4 w-4 ${selectedEmail.starred ? "fill-amber-400" : ""}`} />
                </button>

                <div className="flex-1" />

                {/* Force sync remote */}
                <button
                  onClick={() => handleForceSyncEmail(selectedEmail)}
                  disabled={isSyncingContent}
                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"
                  title="Actualiser et récupérer le contenu intégral"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncingContent ? "animate-spin text-blue-600" : ""}`} />
                </button>

                {/* Print */}
                <button
                  onClick={() => handlePrintEmail(selectedEmail)}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                  title="Imprimer l'e-mail"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>

              {/* Contenu du mail */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Ligne d'Objet Style Gmail */}
                <div className="flex items-center justify-between gap-4 py-4 px-6 lg:px-8 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <h1 className="text-xl lg:text-2xl font-normal text-slate-900 tracking-tight break-words">
                      {selectedEmail.subject}
                    </h1>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 flex-shrink-0">
                      {selectedEmail.folder === "inbox"
                        ? "Boîte de réception"
                        : selectedEmail.folder === "sent"
                        ? "Envoyé"
                        : selectedEmail.folder === "drafts"
                        ? "Brouillon"
                        : selectedEmail.folder === "spams"
                        ? "Spam"
                        : selectedEmail.folder === "folders"
                        ? "Archives"
                        : selectedEmail.folder}
                    </span>
                  </div>
                </div>

                {/* En-tête Expéditeur Style Gmail avec popup "à moi ▼" */}
                <div className="flex items-start justify-between gap-4 py-4 px-6 lg:px-8 border-b border-slate-100/80">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Initial Avatar avec couleur Google */}
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-2xs flex-shrink-0 ${getAvatarColor(
                        selectedEmail.sender || selectedEmail.email
                      )}`}
                    >
                      {(selectedEmail.sender || selectedEmail.email || "M").charAt(0).toUpperCase()}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {selectedEmail.sender}
                        </span>
                        <span className="text-xs text-slate-500 font-normal">
                          &lt;{selectedEmail.email}&gt;
                        </span>
                      </div>

                      {/* Déclencheur détails "à moi ▼" */}
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setShowEmailDetailsModal(!showEmailDetailsModal)}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-1.5 py-0.5 rounded transition-colors"
                        >
                          <span>à moi</span>
                          <ChevronDown className="h-3 w-3 text-slate-400" />
                        </button>

                        {/* Modale popup détails style Gmail */}
                        {showEmailDetailsModal && (
                          <div className="absolute left-0 mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 text-xs z-30 animate-in fade-in zoom-in-95 duration-150 space-y-2">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-bold text-slate-800">
                              <span>Détails du message</span>
                              <button
                                onClick={() => setShowEmailDetailsModal(false)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-slate-500">
                              <span className="font-semibold text-slate-700">De :</span>
                              <span className="col-span-3 text-slate-800 break-words">
                                {selectedEmail.sender} &lt;{selectedEmail.email}&gt;
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-slate-500">
                              <span className="font-semibold text-slate-700">À :</span>
                              <span className="col-span-3 text-slate-800 break-words">
                                {selectedEmail.to || userEmail}
                              </span>
                            </div>
                            {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                              <div className="grid grid-cols-4 gap-1 text-slate-500">
                                <span className="font-semibold text-slate-700">Cc :</span>
                                <span className="col-span-3 text-slate-800 break-words">
                                  {selectedEmail.cc.join(", ")}
                                </span>
                              </div>
                            )}
                            <div className="grid grid-cols-4 gap-1 text-slate-500">
                              <span className="font-semibold text-slate-700">Date :</span>
                              <span className="col-span-3 text-slate-800">
                                {selectedEmail.fullDate || selectedEmail.date}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-slate-500">
                              <span className="font-semibold text-slate-700">Objet :</span>
                              <span className="col-span-3 text-slate-800 break-words">
                                {selectedEmail.subject}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-slate-500 pt-1.5 border-t border-slate-100">
                              <span className="font-semibold text-slate-700">Sécurité :</span>
                              <span className="col-span-3 text-emerald-700 flex items-center gap-1 font-medium">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Chiffrement standard (TLS)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Date & Actions rapides à droite */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                      {selectedEmail.fullDate || selectedEmail.date}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStar(selectedEmail)}
                      className={`p-1.5 rounded-full transition-colors ${
                        selectedEmail.starred
                          ? "text-amber-500 bg-amber-50"
                          : "text-slate-400 hover:text-amber-500 hover:bg-slate-100"
                      }`}
                      title="Important"
                    >
                      <Star className={`h-4 w-4 ${selectedEmail.starred ? "fill-amber-400" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReply(selectedEmail)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                      title="Répondre"
                    >
                      <Reply className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="max-w-4xl mx-auto p-6 lg:p-8">

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
                      {selectedEmail.body_text || selectedEmail.body || (
                        <div className="py-4 flex flex-col items-start gap-3">
                          <p className="italic text-slate-400 text-sm">
                            (Ce message ne contient pas de texte préchargé)
                          </p>
                          <button
                            type="button"
                            onClick={() => handleForceSyncEmail(selectedEmail)}
                            disabled={isSyncingContent}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingContent ? "animate-spin" : ""}`} />
                            {isSyncingContent ? "Récupération en cours..." : "Actualiser et charger le contenu intégral"}
                          </button>
                        </div>
                      )}
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

                  {/* Actions Rapides en bas du mail Style Gmail (Pills) */}
                  <div className="mt-12 pt-6 border-t border-slate-100 flex flex-wrap gap-2.5">
                    <button
                      onClick={() => handleReply(selectedEmail)}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs"
                    >
                      <Reply className="h-4 w-4 text-slate-500" />
                      <span>Répondre</span>
                    </button>
                    <button
                      onClick={() => handleReplyAll(selectedEmail)}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs"
                    >
                      <ReplyAll className="h-4 w-4 text-slate-500" />
                      <span>Répondre à tous</span>
                    </button>
                    <button
                      onClick={() => handleForward(selectedEmail)}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs"
                    >
                      <Forward className="h-4 w-4 text-slate-500" />
                      <span>Transférer</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-white p-6 text-center">
              <div className="h-20 w-20 bg-[#f2f6fc] rounded-full flex items-center justify-center mb-4 text-slate-400">
                <MailOpen className="h-10 w-10 text-blue-500/70" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">Aucun message sélectionné</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Sélectionnez une conversation dans la liste à gauche pour afficher son contenu.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* COMPOSER (OVERLAY STYLE GMAIL MATERIAL 3) */}
      {isComposing && (
        <>
          {composerMinimized ? (
            /* Version réduite (Dock en bas à droite Style Gmail) */
            <div className="fixed bottom-0 right-4 sm:right-8 z-50 w-72 h-10 bg-[#f2f6fc] border border-slate-300 rounded-t-xl shadow-xl flex items-center justify-between px-4 cursor-pointer hover:bg-[#eaf1fb] transition-colors">
              <span
                onClick={() => setComposerMinimized(false)}
                className="font-medium text-xs text-[#041e49] truncate pr-2 flex-1 select-none"
              >
                {composerTitle}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setComposerMinimized(false)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded"
                  title="Agrandir"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsComposing(false);
                    setComposerMinimized(false);
                    setShowCcBcc(false);
                  }}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded"
                  title="Fermer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Fenêtre de composition standard ou plein écran */
            <div
              className={
                composerMaximized
                  ? "fixed inset-2 sm:inset-6 z-50 bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
                  : "fixed bottom-0 right-0 sm:right-8 z-50 w-full sm:w-[580px] h-[85vh] sm:h-[580px] bg-white sm:rounded-t-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-200"
              }
            >
              {/* Header Style Gmail */}
              <div className="bg-[#f2f6fc] text-[#041e49] px-4 py-2.5 flex justify-between items-center border-b border-slate-200 select-none">
                <span className="font-semibold text-xs tracking-wide truncate pr-4 text-slate-800">
                  {composerTitle}
                </span>
                <div className="flex items-center gap-1 text-slate-500">
                  {/* Réduire */}
                  <button
                    type="button"
                    onClick={() => setComposerMinimized(true)}
                    className="p-1 hover:text-slate-900 hover:bg-slate-200/60 rounded transition-colors"
                    title="Réduire"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  {/* Agrandir / Plein écran */}
                  <button
                    type="button"
                    onClick={() => setComposerMaximized(!composerMaximized)}
                    className="p-1 hover:text-slate-900 hover:bg-slate-200/60 rounded transition-colors"
                    title={composerMaximized ? "Réduire la taille" : "Plein écran"}
                  >
                    {composerMaximized ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {/* Fermer */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsComposing(false);
                      setSentSuccess(false);
                      setShowCcBcc(false);
                      setComposerMaximized(false);
                      setComposerMinimized(false);
                    }}
                    className="p-1 hover:text-slate-900 hover:bg-slate-200/60 rounded transition-colors"
                    title="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {sentSuccess ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-white p-6">
                  <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border-4 border-emerald-100/50 animate-in zoom-in duration-300">
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Message envoyé !</h3>
                  <p className="text-slate-500 text-xs text-center">Votre communication a bien été transmise avec succès.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
                    {/* De */}
                    <div className="flex px-4 py-2 border-b border-slate-100 items-center text-xs text-slate-500">
                      <span className="font-medium w-8">De</span>
                      <span className="font-semibold text-slate-700">{userEmail}</span>
                    </div>

                    {/* Champ À avec tags / badges */}
                    <div className="flex flex-wrap px-4 py-2 border-b border-slate-100 items-center gap-1.5 focus-within:bg-blue-50/20 transition-colors">
                      <span className="text-xs font-medium text-slate-500 mr-2 w-6">À</span>
                      {composeToTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-100/80 text-blue-800 rounded-full text-xs font-semibold animate-in zoom-in-95 duration-100"
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
                        placeholder={composeToTags.length === 0 ? "Destinataires (espace ou Entrée pour valider)" : "Ajouter..."}
                        className="flex-1 min-w-[160px] focus:outline-none text-xs bg-transparent placeholder-slate-400 py-1"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCcBcc(!showCcBcc)}
                        className={`text-[11px] font-semibold ml-auto uppercase tracking-wider px-2 py-0.5 rounded transition-colors ${
                          showCcBcc
                            ? "bg-blue-100 text-blue-700"
                            : "text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                        }`}
                      >
                        Cc / Cci
                      </button>
                    </div>

                    {showCcBcc && (
                      <div className="animate-in slide-in-from-top-2 duration-150">
                        {/* Champ Cc avec tags */}
                        <div className="flex flex-wrap px-4 py-1.5 border-b border-slate-100 items-center gap-1.5 bg-slate-50/50 focus-within:bg-blue-50/20 transition-colors">
                          <span className="text-xs font-medium text-slate-500 mr-2 w-6">Cc</span>
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
                            placeholder={composeCcTags.length === 0 ? "Destinataires en copie" : "Ajouter Cc..."}
                            className="flex-1 min-w-[140px] focus:outline-none text-xs bg-transparent placeholder-slate-400 py-1"
                          />
                        </div>

                        {/* Champ Cci avec tags */}
                        <div className="flex flex-wrap px-4 py-1.5 border-b border-slate-100 items-center gap-1.5 bg-slate-50/50 focus-within:bg-blue-50/20 transition-colors">
                          <span className="text-xs font-medium text-slate-500 mr-2 w-6">Cci</span>
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
                            className="flex-1 min-w-[140px] focus:outline-none text-xs bg-transparent placeholder-slate-400 py-1"
                          />
                        </div>
                      </div>
                    )}

                    {/* Objet */}
                    <div className="flex px-4 py-2 border-b border-slate-100 items-center">
                      <input
                        type="text"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        placeholder="Objet"
                        className="flex-1 focus:outline-none text-xs font-medium placeholder-slate-400 bg-transparent text-slate-900"
                      />
                    </div>

                    {/* Barre de style typographique & signature Style Gmail */}
                    <div className="flex flex-wrap items-center gap-2 px-4 py-1.5 bg-slate-50/70 border-b border-slate-100 text-[11px]">
                      {/* Police */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Police:</span>
                        <select
                          value={mailSettings.fontFamily}
                          onChange={(e) => {
                            const updated = { ...mailSettings, fontFamily: e.target.value };
                            setMailSettings(updated);
                            saveMailSettingsToStorage(updated, userEmail);
                          }}
                          className="p-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700 focus:outline-none focus:border-blue-500"
                        >
                          {AVAILABLE_FONTS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label.split(" (")[0]}</option>
                          ))}
                        </select>
                      </div>

                      {/* Taille */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">Taille:</span>
                        <select
                          value={mailSettings.fontSize}
                          onChange={(e) => {
                            const updated = { ...mailSettings, fontSize: e.target.value };
                            setMailSettings(updated);
                            saveMailSettingsToStorage(updated, userEmail);
                          }}
                          className="p-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700 focus:outline-none focus:border-blue-500"
                        >
                          {AVAILABLE_FONT_SIZES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Couleur */}
                      <div className="flex items-center gap-1 ml-1">
                        <span className="text-slate-400">Couleur:</span>
                        <input
                          type="color"
                          value={mailSettings.textColor}
                          onChange={(e) => {
                            const updated = { ...mailSettings, textColor: e.target.value };
                            setMailSettings(updated);
                            saveMailSettingsToStorage(updated, userEmail);
                          }}
                          className="h-5 w-5 rounded cursor-pointer border border-slate-200 p-0 bg-transparent"
                          title="Couleur du texte"
                        />
                      </div>

                      {/* Insérer signature */}
                      {mailSettings.signature && (
                        <button
                          type="button"
                          onClick={() => {
                            setComposeBody((prev) => `${prev}\n\n${mailSettings.signature}`);
                          }}
                          className="ml-auto text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
                          title="Insérer ma signature configurée"
                        >
                          + Signature
                        </button>
                      )}
                    </div>

                    {/* Zone de saisie du message */}
                    <textarea
                      ref={composeTextareaRef}
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      style={{
                        fontFamily: mailSettings.fontFamily,
                        fontSize: mailSettings.fontSize,
                        color: mailSettings.textColor,
                      }}
                      placeholder="Rédigez votre message..."
                      className="flex-1 p-4 focus:outline-none resize-none text-xs leading-relaxed bg-transparent min-h-[220px]"
                    />

                    {/* Fichiers joints */}
                    {composeAttachments.length > 0 && (
                      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 space-y-1.5">
                        <p className="text-[11px] font-semibold text-slate-500">
                          Pièces jointes ({composeAttachments.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {composeAttachments.map((att, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-2xs"
                            >
                              <Paperclip className="h-3 w-3 text-blue-600" />
                              <span className="truncate max-w-[160px]">{att.filename}</span>
                              <span className="text-slate-400 text-[10px]">({formatFileSize(att.size)})</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveComposeAttachment(idx)}
                                className="text-slate-400 hover:text-red-600 ml-1"
                                title="Retirer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Composer Footer Style Gmail */}
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Send button (Pill Gmail) */}
                      <button
                        onClick={handleSendEmail}
                        disabled={isSending}
                        className="px-6 py-2 bg-[#0b57d0] hover:bg-[#0842a0] text-white rounded-full text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-60 cursor-pointer"
                      >
                        <span>{isSending ? "Envoi..." : "Envoyer"}</span>
                        <Send className={`h-3.5 w-3.5 ${isSending ? "animate-pulse" : ""}`} />
                      </button>

                      {/* Attach button */}
                      <label
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                        title="Joindre des fichiers"
                      >
                        <input
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Paperclip className="h-4 w-4" />
                      </label>

                      {/* Save draft button */}
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={isSavingDraft}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-1.5"
                        title="Enregistrer dans les brouillons"
                      >
                        <Save className="h-3.5 w-3.5 text-slate-400" />
                        <span>Brouillon</span>
                      </button>
                    </div>

                    {/* Discard button */}
                    <button
                      onClick={() => {
                        setIsComposing(false);
                        setShowCcBcc(false);
                        setEditingDraftId(null);
                        setComposeAttachments([]);
                        setComposerMinimized(false);
                        setComposerMaximized(false);
                      }}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Supprimer le brouillon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
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
