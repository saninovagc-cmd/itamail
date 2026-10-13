import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateSubscriptionPrice } from '@/lib/pricing';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orgId,
      interval = 'monthly',
      mailboxesCount = 1,
      transactionId,
      mocked = false,
    } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId manquant' }, { status: 400 });
    }

    const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY;
    const FEDAPAY_ENVIRONMENT = process.env.FEDAPAY_ENVIRONMENT || 'sandbox';
    const baseUrl =
      FEDAPAY_ENVIRONMENT === 'live'
        ? 'https://api.fedapay.com'
        : 'https://sandbox-api.fedapay.com';

    // 1. Vérification réelle FedaPay si ce n'est pas un mock et qu'une clé est configurée
    if (!mocked && FEDAPAY_SECRET_KEY && transactionId) {
      try {
        const verifyRes = await fetch(`${baseUrl}/v1/transactions/${transactionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
          },
        });
        if (verifyRes.ok) {
          const tx = await verifyRes.json();
          const status = tx?.v1?.status || tx?.status;
          if (status !== 'approved' && status !== 'transferred') {
            return NextResponse.json(
              { error: `Le paiement n'a pas été validé par FedaPay (statut : ${status}).` },
              { status: 400 }
            );
          }
        }
      } catch (err) {
        console.error('[Verify FedaPay Error]', err);
      }
    }

    const calc = calculateSubscriptionPrice(mailboxesCount, interval);

    // Initialisation Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer un ID de plan existant dans la base pour satisfaire la contrainte foreign key
    const { data: existingPlan } = await supabase.from('plans').select('id').limit(1).single();
    const planId = existingPlan?.id || '210e1848-3403-4ed7-838e-b8ca5884d166';

    // Calcul de la date d'échéance : +1 mois ou +1 an
    const now = new Date();
    const expirationDate = new Date(now);
    if (interval === 'yearly') {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    } else {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    }

    // Récupérer l'abonnement existant de l'organisation
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('org_id', orgId)
      .maybeSingle();

    if (currentSub?.id) {
      // Mise à jour de l'abonnement existant
      await supabase
        .from('subscriptions')
        .update({
          plan_id: planId,
          status: 'ACTIVE',
          current_period_end: expirationDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSub.id);
    } else {
      // Création du nouvel abonnement
      await supabase.from('subscriptions').insert({
        org_id: orgId,
        plan_id: planId,
        status: 'ACTIVE',
        current_period_end: expirationDate.toISOString(),
      });
    }

    // Sauvegarder les métadonnées de paiement dans l'organisation
    const metaRef = `fedapay:${transactionId || 'manual'}|${interval}|${calc.mailboxesCount}|${calc.totalAmount}`;
    await supabase
      .from('organizations')
      .update({
        stripe_customer_id: metaRef,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId);

    return NextResponse.json({
      success: true,
      message: 'Abonnement activé avec succès.',
      current_period_end: expirationDate.toISOString(),
      calc,
    });
  } catch (error: any) {
    console.error('[Verify Route Error]', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la validation de la transaction.' },
      { status: 500 }
    );
  }
}
