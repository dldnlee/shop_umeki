import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/payment/register
 *
 * Registers a payment transaction with EasyPay and returns the payment page URL.
 * This is the first step in the EasyPay payment flow.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, orderInfo } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get EasyPay configuration from environment variables
    const mallId = process.env.EASYPAY_MALL_ID;
    const testMode = process.env.EASYPAY_TEST_MODE === 'true';

    if (!mallId) {
      console.error('EasyPay merchant ID not configured');
      return NextResponse.json(
        { error: 'Payment system configuration error' },
        { status: 500 }
      );
    }

    // Determine device type (mobile vs PC)
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
    const deviceType = isMobile ? 'mobile' : 'pc';

    // Generate unique order number (YYYYMMDD + random 9 digits)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const shopOrderNo = `${yyyy}${mm}${dd}${Math.floor(Math.random() * 1e9)}`;

    // Get base URL for return URL
    // IMPORTANT: EasyPay sends data back via POST to this URL, not GET with query params
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/api/payment/callback`;

    // Prepare request to EasyPay WebPay API
    const webpayPath = `${process.env.EASYPAY_API_URL}/api/ep9/trades/webpay`;

    const requestBody = {
      mallId: mallId,
      shopOrderNo: shopOrderNo,
      amount: amount,
      payMethodTypeCode: 11, // 11 = Credit card, adjust based on your needs
      currency: "00", // 00 = KRW
      returnUrl: returnUrl,
      deviceTypeCode: deviceType,
      clientTypeCode: "00", // 00 = Web
      orderInfo: {
        goodsName: orderInfo?.goodsName || "상품",
        ...orderInfo
      }
    };

    // Call EasyPay WebPay API
    console.log('Calling EasyPay WebPay API:', webpayPath);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const webpayRes = await fetch(webpayPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Charset': 'UTF-8'
      },
      body: JSON.stringify(requestBody),
    });

    const webpayData = await webpayRes.json();

    console.log('EasyPay response status:', webpayRes.status);
    console.log('EasyPay response data:', JSON.stringify(webpayData, null, 2));

    // Check if the request was successful
    if (!webpayRes.ok || webpayData?.resCd !== '0000' || !webpayData?.authPageUrl) {
      console.error('EasyPay WebPay API error:', webpayData);
      return NextResponse.json(
        {
          error: 'Failed to register payment',
          message: webpayData?.resMsg || 'Unknown error',
          details: webpayData
        },
        { status: 400 }
      );
    }

    // Return the payment page URL and order number to the client
    return NextResponse.json({
      success: true,
      authPageUrl: webpayData.authPageUrl,
      shopOrderNo: shopOrderNo,
      message: 'Payment registration successful'
    });

  } catch (error) {
    console.error('Payment registration error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
