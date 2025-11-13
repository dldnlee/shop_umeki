import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { amount, currency, orderId, items } = await request.json();

    // Validate required fields
    if (!amount || !currency || !orderId || !items) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: amount, currency, orderId, items"
        },
        { status: 400 }
      );
    }

    // Get PayPal credentials from environment
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const isSandbox = process.env.NEXT_PUBLIC_PAYPAL_SANDBOX === "true";

    if (!clientId || !clientSecret) {
      console.error("PayPal credentials not configured");
      return NextResponse.json(
        {
          success: false,
          message: "PayPal configuration error"
        },
        { status: 500 }
      );
    }

    // PayPal API URL
    const baseURL = isSandbox
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";

    // Step 1: Get OAuth token
    const authResponse = await fetch(`${baseURL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json();
      console.error("PayPal OAuth error:", errorData);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to authenticate with PayPal"
        },
        { status: 500 }
      );
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Step 2: Create PayPal order
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: orderId,
          custom_id: orderId,
          description: `Order ${orderId}`,
          amount: {
            currency_code: currency,
            value: amount,
            breakdown: {
              item_total: {
                currency_code: currency,
                value: amount,
              },
            },
          },
          items: items,
        },
      ],
      application_context: {
        brand_name: "YUMEKI Shop",
        locale: "ko-KR",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      },
    };

    const createOrderResponse = await fetch(`${baseURL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!createOrderResponse.ok) {
      const errorData = await createOrderResponse.json();
      console.error("PayPal create order error:", errorData);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to create PayPal order",
          details: errorData
        },
        { status: 500 }
      );
    }

    const orderData = await createOrderResponse.json();

    return NextResponse.json({
      success: true,
      orderId: orderData.id,
      originalOrderId: orderId,
      message: "Order created successfully",
    });

  } catch (error) {
    console.error("Error in PayPal create-order route:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}
