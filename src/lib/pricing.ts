export type BillingInterval = 'monthly' | 'yearly';

export interface SubscriptionCalculation {
  interval: BillingInterval;
  mailboxesCount: number; // minimum 1
  firstMailboxPrice: number; // 5 000 FCFA ou 50 000 FCFA
  additionalMailboxesCount: number; // mailboxesCount - 1
  additionalMailboxPrice: number; // 2 500 FCFA ou 25 000 FCFA
  additionalTotal: number;
  totalAmount: number;
  monthlyEquivalent: number; // équivalent mensuel en FCFA
  savingsVsMonthly: number; // économie annuelle en FCFA
  savingsPercentage: number; // % d'économie en annuel (~16.6% à 20%)
}

/**
 * Règle de tarification officielle ITA MAIL (réduite de 50%) :
 * - Mensuel : 5.000 F CFA pour le 1er mail de l'organisation, 2.500 F CFA par mail supplémentaire.
 * - Annuel : 50.000 F CFA pour le 1er mail de l'organisation, 25.000 F CFA par mail supplémentaire.
 */
export function calculateSubscriptionPrice(
  mailboxesCount: number,
  interval: BillingInterval = 'monthly'
): SubscriptionCalculation {
  const count = Math.max(1, Math.floor(mailboxesCount || 1));
  const isYearly = interval === 'yearly';

  const firstMailboxPrice = isYearly ? 50000 : 5000;
  const additionalMailboxPrice = isYearly ? 25000 : 2500;

  const additionalCount = count - 1;
  const additionalTotal = additionalCount * additionalMailboxPrice;
  const totalAmount = firstMailboxPrice + additionalTotal;

  // Calcul comparatif annuel vs mensuel
  const monthlyCostForSameBoxes = 5000 + additionalCount * 2500;
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
