import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Webhook FedaPay pour écouter les transactions approuvées
export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Vérifier le type d'événement FedaPay
    const eventName = payload.name || payload.event;
    const entity = payload.entity || payload.data || payload;

    // FedaPay envoie "transaction.approved" ou le statut "approved"
    const status = entity.status;
    const transactionId = entity.id;
    const customMetadata = entity.custom_metadata || {};

    const orgId = customMetadata.org_id;
    const interval = customMetadata.interval || 'monthly';
    const mailboxesCount = Number(customMetadata.mailboxes_count) || 1;
    const amount = Number(customMetadata.amount) || entity.amount;

    if (status === 'approved' && orgId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Calcul date d'expiration
      const now = new Date();
      const expirationDate = new Date(now);
      if (interval === 'yearly') {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      } else {
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      }

      // Récupérer un ID de plan
      const { data: existingPlan } = await supabase.from('plans').select('id').limit(1).single();
      const planId = existingPlan?.id || '210e1848-3403-4ed7-838e-b8ca5884d166';

      // Vérifier si l'organisation a déjà un abonnement
      const { data: currentSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('org_id', orgId)
        .maybeSingle();

      if (currentSub?.id) {
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
        await supabase.from('subscriptions').insert({
          org_id: orgId,
          plan_id: planId,
          status: 'ACTIVE',
          current_period_end: expirationDate.toISOString(),
        });
      }

      // Enregistrer la référence dans l'organisation
      const metaRef = `fedapay:${transactionId}|${interval}|${mailboxesCount}|${amount}`;
      await supabase
        .from('organizations')
        .update({
          stripe_customer_id: metaRef,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId);

      console.log(`[FedaPay Webhook] Abonnement activé pour l'organisation ${orgId} jusqu'au ${expirationDate.toISOString()}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[FedaPay Webhook Error]', error);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
