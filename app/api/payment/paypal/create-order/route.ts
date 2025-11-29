import { NextRequest, NextResponse } from 'next/server';
import paypal from '@paypal/checkout-server-sdk';

/**
 * POST /api/payment/paypal/create-order
 *
 * Creates a PayPal order using the @paypal/checkout-server-sdk.
 * This is step 1 of the PayPal checkout flow.
 * Called from the client-side PayPal button.
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
    const { amount, currency = 'USD', orderId, items = [], shippingFee = 0 } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid amount',
          message: '유효하지 않은 금액입니다'
        },
        { status: 400 }
      );
    }

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

    // Validate currency
    if (!['USD', 'JPY'].includes(currency)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid currency',
          message: 'Only USD and JPY currencies are supported'
        },
        { status: 400 }
      );
    }

    // Get PayPal client
    const client = getPayPalClient();

    // Get return URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/payment/callback`;
    const cancelUrl = `${baseUrl}/payment`;

    // For zero-decimal currencies like JPY, no decimal point is needed
    const isZeroDecimalCurrency = currency === 'JPY';
    const formatAmount = (amt: number) => {
      return isZeroDecimalCurrency
        ? String(Math.round(amt))  // No decimals for JPY
        : (amt / 100).toFixed(2);  // 2 decimals for USD
    };

    // Prepare items array
    const orderItems = items.length > 0 ? items.map((item: {
      name: string;
      sku?: string;
      quantity: string;
      unit_amount: { currency_code: string; value: string };
    }) => ({
      name: item.name.substring(0, 127), // PayPal has a 127 character limit for item names
      ...(item.sku ? { sku: item.sku } : {}),
      quantity: item.quantity,
      unit_amount: {
        currency_code: item.unit_amount.currency_code,
        value: formatAmount(parseFloat(item.unit_amount.value))
      }
    })) : [
      {
        name: '상품',
        quantity: '1',
        unit_amount: {
          currency_code: currency,
          value: formatAmount(amount)
        }
      }
    ];

    // Calculate item_total and shipping for breakdown
    const itemTotal = formatAmount(amount - shippingFee);
    const shippingAmount = formatAmount(shippingFee);
    const totalAmount = formatAmount(amount);

    // Create order request
    const orderRequest = new paypal.orders.OrdersCreateRequest();
    orderRequest.prefer('return=representation');
    orderRequest.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: orderId,
          amount: {
            currency_code: currency,
            value: totalAmount,
            breakdown: {
              item_total: {
                currency_code: currency,
                value: itemTotal
              },
              shipping: {
                currency_code: currency,
                value: shippingAmount
              },
              handling: {
                currency_code: currency,
                value: '0'
              },
              tax_total: {
                currency_code: currency,
                value: '0'
              },
              insurance: {
                currency_code: currency,
                value: '0'
              },
              shipping_discount: {
                currency_code: currency,
                value: '0'
              },
              discount: {
                currency_code: currency,
                value: '0'
              }
            }
          },
          items: orderItems
        }
      ],
      application_context: {
        brand_name: 'The Union Shop',
        locale: 'ko-KR',
        landing_page: 'LOGIN',
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: 'PAY_NOW'
      }
    });

    console.log('Creating PayPal order with SDK');

    // Execute request
    const response = await client.execute(orderRequest);

    console.log('PayPal order created successfully:', response.result.id);

    return NextResponse.json({
      success: true,
      orderId: response.result.id,
      message: 'Order created successfully'
    });

  } catch (error) {
    console.error('PayPal create-order error:', error);
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
