/**
 * IMailProvider : Interface d'abstraction pour le serveur de messagerie.
 * 
 * Cette interface permet de découpler la logique métier de l'application Next.js
 * de l'infrastructure d'hébergement mail réelle (ex: Poste.io, cPanel, Mailcow, AWS).
 */

export interface MailboxUsage {
  usageMB: number;
  limitMB: number;
}

export interface IMailProvider {
  /**
   * Configure un nouveau domaine sur le serveur mail
   */
  addDomain(domain: string): Promise<boolean>;

  /**
   * Supprime un domaine du serveur mail
   */
  removeDomain(domain: string): Promise<boolean>;

  /**
   * Crée une nouvelle boîte e-mail
   * @param domain Le domaine (ex: entreprise.bj)
   * @param address L'adresse complète (ex: contact@entreprise.bj)
   * @param passwordHash Le mot de passe haché ou en clair selon l'API externe
   * @param quotaMB La limite de stockage en Mégaoctets
   */
  createMailbox(domain: string, address: string, passwordHash: string, quotaMB: number): Promise<boolean>;

  /**
   * Supprime définitivement une boîte e-mail
   */
  deleteMailbox(address: string): Promise<boolean>;

  /**
   * Suspend temporairement l'envoi/réception pour une boîte
   */
  suspendMailbox(address: string): Promise<boolean>;

  /**
   * Réactive une boîte suspendue
   */
  activateMailbox(address: string): Promise<boolean>;

  /**
   * Met à jour le mot de passe d'une boîte e-mail
   */
  updatePassword(address: string, newPasswordHash: string): Promise<boolean>;

  /**
   * Récupère la consommation d'espace disque en temps réel
   */
  getMailboxUsage(address: string): Promise<MailboxUsage>;

  /**
   * Crée un alias (ex: rediriger support@ vers jean@)
   */
  createAlias(sourceAddress: string, targetAddress: string): Promise<boolean>;

  /**
   * Supprime un alias
   */
  deleteAlias(sourceAddress: string): Promise<boolean>;
}
