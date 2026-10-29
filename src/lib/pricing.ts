export type BillingInterval = 'monthly' | 'yearly';

export interface SubscriptionCalculation {
  interval: BillingInterval;
  mailboxesCount: number; // minimum 1
  firstMailboxPrice: number; // 2 500 FCFA ou 25 000 FCFA
  additionalMailboxesCount: number; // mailboxesCount - 1
  additionalMailboxPrice: number; // 1 250 FCFA ou 12 500 FCFA
  additionalTotal: number;
  totalAmount: number;
  monthlyEquivalent: number; // équivalent mensuel en FCFA
  savingsVsMonthly: number; // économie annuelle en FCFA
  savingsPercentage: number; // % d'économie en annuel (~16.6% à 20%)
}

/**
 * Règle de tarification ultra-compétitive ITA MAIL :
 * - Mensuel : 2.500 F CFA pour le 1er mail de l'organisation, 1.250 F CFA par mail supplémentaire.
 * - Annuel : 25.000 F CFA pour le 1er mail de l'organisation, 12.500 F CFA par mail supplémentaire.
 */
export function calculateSubscriptionPrice(
  mailboxesCount: number,
  interval: BillingInterval = 'monthly'
): SubscriptionCalculation {
  const count = Math.max(1, Math.floor(mailboxesCount || 1));
  const isYearly = interval === 'yearly';

  const firstMailboxPrice = isYearly ? 25000 : 2500;
  const additionalMailboxPrice = isYearly ? 12500 : 1250;

  const additionalCount = count - 1;
  const additionalTotal = additionalCount * additionalMailboxPrice;
  const totalAmount = firstMailboxPrice + additionalTotal;

  // Calcul comparatif annuel vs mensuel
  const monthlyCostForSameBoxes = 2500 + additionalCount * 1250;
  const fullYearCostIfMonthly = monthlyCostForSameBoxes * 12;

  const savingsVsMonthly = isYearly ? Math.max(0, fullYearCostIfMonthly - totalAmount) : 0;
  const savingsPercentage = isYearly && fullYearCostIfMonthly > 0 
    ? Math.round((savingsVsMonthly / fullYearCostIfMonthly) * 100) 
    : 0;

  const monthlyEquivalent = isYearly ? Math.round(totalAmount / 12) : totalAmount;

  return {
    interval,
    mailboxesCount: count,
    firstMailboxPrice,
    additionalMailboxesCount: additionalCount,
    additionalMailboxPrice,
    additionalTotal,
    totalAmount,
    monthlyEquivalent,
    savingsVsMonthly,
    savingsPercentage,
  };
}

export function formatFCFA(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' F CFA';
}
