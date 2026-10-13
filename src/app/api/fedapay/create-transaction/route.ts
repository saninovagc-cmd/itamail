import { NextResponse } from 'next/server';
import { calculateSubscriptionPrice } from '@/lib/pricing';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orgId,
      mailboxesCount = 1,
      interval = 'monthly',
      customerEmail,
      customerName = 'Client',
      customerPhone,
      returnUrl,
    } = body;

    if (!orgId || !customerEmail) {
      return NextResponse.json(
        { error: 'Paramètres manquants (orgId et customerEmail requis).' },
        { status: 400 }
      );
    }

    const calc = calculateSubscriptionPrice(mailboxesCount, interval);
    const amount = calc.totalAmount;

    const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY;
    const FEDAPAY_ENVIRONMENT = process.env.FEDAPAY_ENVIRONMENT || 'sandbox';
    const baseUrl =
      FEDAPAY_ENVIRONMENT === 'live'
        ? 'https://api.fedapay.com'
        : 'https://sandbox-api.fedapay.com';

    // Obtenir l'URL de base de l'application
    const origin =
      returnUrl ||
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://itamail.vercel.app';

    // 1. Si la clé FedaPay est configurée, on utilise la véritable API FedaPay
    if (FEDAPAY_SECRET_KEY) {
      try {
        const callbackUrl = `${origin}/dashboard/abonnement?payment=success&interval=${interval}&count=${calc.mailboxesCount}&org_id=${orgId}`;

        // Nettoyer et formater le numéro de téléphone pour FedaPay
        const cleanPhone = (customerPhone || '+22990000000').replace(/\s+/g, '');

        const txPayload = {
          description: `Abonnement ITA MAIL - ${interval === 'yearly' ? 'Annuel' : 'Mensuel'} (${calc.mailboxesCount} boîte${calc.mailboxesCount > 1 ? 's' : ''})`,
          amount: amount,
          currency: { iso: 'XOF' },
          callback_url: callbackUrl,
          customer: {
            firstname: customerName.split(' ')[0] || customerName,
            lastname: customerName.split(' ').slice(1).join(' ') || 'Client',
            email: customerEmail,
            phone_number: {
              number: cleanPhone,
              country: 'bj',
            },
          },
          custom_metadata: {
            org_id: orgId,
            interval: interval,
            mailboxes_count: calc.mailboxesCount,
            amount: amount,
          },
        };

        const txRes = await fetch(`${baseUrl}/v1/transactions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(txPayload),
        });

        const txData = await txRes.json();

        if (!txRes.ok) {
          console.error('[FedaPay API Error]', txData);
          return NextResponse.json(
            { error: txData.message || "Erreur lors de la création de la transaction FedaPay." },
            { status: txRes.status }
          );
        }

        const transactionId = txData?.v1?.id || txData?.id;

        // Génération du token de checkout
        const tokenRes = await fetch(`${baseUrl}/v1/transactions/${transactionId}/token`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        const tokenData = await tokenRes.json();
        const checkoutUrl = tokenData?.url || tokenData?.token?.url;

        return NextResponse.json({
          success: true,
          mocked: false,
          transactionId: transactionId,
          checkoutUrl: checkoutUrl,
          amount: amount,
          calc,
        });
      } catch (fedaError: any) {
        console.error('[FedaPay Exception]', fedaError);
        return NextResponse.json(
          { error: fedaError.message || 'Erreur de communication avec FedaPay.' },
          { status: 500 }
        );
      }
    }

    // 2. Si la clé FedaPay n'est pas encore ajoutée (en attente des clés du client)
    // On renvoie un mode simulation élégant pour permettre le test immédiat
    const mockTransactionId = `fedapay_mock_${Date.now()}`;
    return NextResponse.json({
      success: true,
      mocked: true,
      transactionId: mockTransactionId,
      checkoutUrl: null,
      amount: amount,
      calc,
      message:
        "Clé FEDAPAY_SECRET_KEY non configurée. Mode test activé pour valider l'expérience utilisateur.",
    });
  } catch (error: any) {
    console.error('[Create Transaction Error]', error);
    return NextResponse.json(
      { error: 'Erreur interne lors de la création de la transaction.' },
      { status: 500 }
    );
  }
}
