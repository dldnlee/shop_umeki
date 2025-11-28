import { NextRequest, NextResponse } from 'next/server';
import paypal from '@paypal/checkout-server-sdk';

/**
 * POST /api/payment/paypal/capture-order
 *
 * Captures payment for a PayPal order using the @paypal/checkout-server-sdk.
 * This is step 3 of the PayPal checkout flow.
 * Called from the client-side PayPal button after buyer approves.
 */

// Configure PayPal environment
function getPayPalClient() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const isSandbox = process.env.NEXT_PUBLIC_PAYPAL_SANDBOX === 'true';

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const environment = isSandbox
    ? new paypal.core.SandboxEnvironment(clientId, clientSecret)
    : new paypal.core.LiveEnvironment(clientId, clientSecret);

  return new paypal.core.PayPalHttpClient(environment);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order ID required',
          message: '주문 ID가 필요합니다'
        },
        { status: 400 }
      );
    }

    // Get PayPal client
    const client = getPayPalClient();

    // Create capture request
    const captureRequest = new paypal.orders.OrdersCaptureRequest(orderId);
    captureRequest.prefer('return=representation');
    // Note: requestBody is optional for capture requests

    console.log('Capturing PayPal order with SDK:', orderId);

    // Execute request
    const response = await client.execute(captureRequest);

    console.log('PayPal order captured successfully:', response.result.id);

    // Extract transaction details
    const result = response.result;
    const transactionId = result.id;
    const status = result.status;
    const purchaseUnit = result.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];

    return NextResponse.json({
      success: true,
      orderId: transactionId,
      status: status,
      captureId: capture?.id,
      paymentId: capture?.id,
      amount: purchaseUnit?.amount?.value,
      currency: purchaseUnit?.amount?.currency_code,
      message: 'Payment captured successfully'
    });

  } catch (error) {
    console.error('PayPal capture-order error:', error);
    const errorMessage = error instanceof Error ? error.message : '서버 오류 발생';
    return NextResponse.json(
      {
        success: false,
        error: 'Server error',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
