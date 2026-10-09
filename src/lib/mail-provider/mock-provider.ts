import { IMailProvider, MailboxUsage } from "./index";

/**
 * MockMailProvider
 * Implémentation simulée de l'interface IMailProvider pour la phase MVP et les tests locaux.
 * En production, cette classe sera remplacée par PosteIoProvider, CpanelProvider, etc.
 */
export class MockMailProvider implements IMailProvider {
  
  async addDomain(domain: string): Promise<boolean> {
    console.log(`[MockMailProvider] Domaine ajouté sur le serveur: ${domain}`);
    return true;
  }

  async removeDomain(domain: string): Promise<boolean> {
    console.log(`[MockMailProvider] Domaine supprimé du serveur: ${domain}`);
    return true;
  }

  async createMailbox(domain: string, address: string, passwordHash: string, quotaMB: number): Promise<boolean> {
    console.log(`[MockMailProvider] Création de la boîte mail ${address} (Quota: ${quotaMB} MB)`);
    // Simulation d'un appel API externe réussi
    return new Promise((resolve) => setTimeout(() => resolve(true), 800));
  }

  async deleteMailbox(address: string): Promise<boolean> {
    console.log(`[MockMailProvider] Suppression de la boîte mail ${address}`);
    return true;
  }

  async suspendMailbox(address: string): Promise<boolean> {
    console.log(`[MockMailProvider] Suspension de la boîte mail ${address}`);
    return true;
  }

  async activateMailbox(address: string): Promise<boolean> {
    console.log(`[MockMailProvider] Réactivation de la boîte mail ${address}`);
    return true;
  }

  async updatePassword(address: string, newPasswordHash: string): Promise<boolean> {
    console.log(`[MockMailProvider] Mot de passe mis à jour pour ${address}`);
    return true;
  }

  async getMailboxUsage(address: string): Promise<MailboxUsage> {
    console.log(`[MockMailProvider] Récupération de l'usage pour ${address}`);
    // Simule une utilisation aléatoire
    return {
      usageMB: Math.floor(Math.random() * 1024),
      limitMB: 5120
    };
  }

  async createAlias(sourceAddress: string, targetAddress: string): Promise<boolean> {
    console.log(`[MockMailProvider] Création de l'alias ${sourceAddress} -> ${targetAddress}`);
    return true;
  }

  async deleteAlias(sourceAddress: string): Promise<boolean> {
    console.log(`[MockMailProvider] Suppression de l'alias ${sourceAddress}`);
    return true;
  }
}

// Factory Pattern pour initialiser le bon provider selon l'environnement
export function getMailProvider(): IMailProvider {
  const providerType = process.env.MAIL_PROVIDER_TYPE || 'mock';

  switch (providerType) {
    case 'posteio':
      // return new PosteIoProvider(process.env.POSTEIO_URL, process.env.POSTEIO_KEY);
      throw new Error("PosteIoProvider not implemented yet");
    case 'cpanel':
      // return new CpanelProvider(...);
      throw new Error("CpanelProvider not implemented yet");
    case 'mock':
    default:
      return new MockMailProvider();
  }
}
