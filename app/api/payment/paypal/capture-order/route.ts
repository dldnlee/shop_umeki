import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required field: orderId"
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

    // Step 2: Capture payment
    const captureResponse = await fetch(
      `${baseURL}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!captureResponse.ok) {
      const errorData = await captureResponse.json();
      console.error("PayPal capture error:", errorData);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to capture payment",
          details: errorData
        },
        { status: 500 }
      );
    }

    const captureData = await captureResponse.json();

    // Extract capture details
    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];

    if (!capture) {
      return NextResponse.json(
        {
          success: false,
          message: "No capture data found in response"
        },
        { status: 500 }
      );
    }

    // Extract original order ID from custom_id or reference_id
    const originalOrderId = captureData.purchase_units?.[0]?.custom_id ||
                           captureData.purchase_units?.[0]?.reference_id;

    return NextResponse.json({
      success: true,
      orderId: captureData.id,
      originalOrderId: originalOrderId,
      status: captureData.status,
      captureId: capture.id,
      paymentId: capture.id,
      amount: capture.amount.value,
      currency: capture.amount.currency_code,
      message: "Payment captured successfully",
    });

  } catch (error) {
    console.error("Error in PayPal capture-order route:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  }
}
