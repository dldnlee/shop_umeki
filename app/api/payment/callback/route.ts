import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/orders';

/**
 * POST /api/payment/callback
 *
 * Handles the payment callback from EasyPay after payment completion.
 * EasyPay sends data via POST (form data or JSON) to this endpoint.
 * This endpoint returns an HTML page that communicates with the parent window.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the callback data from EasyPay
    // Try both JSON and form data
    let body: any;
    const contentType = request.headers.get('content-type') || '';

    console.log('=== POST /api/payment/callback ===');
    console.log('Content-Type:', contentType);

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // Parse as form data
      const formData = await request.formData();
      body = {};
      formData.forEach((value, key) => {
        body[key] = value;
      });
    }

    console.log('Payment callback POST body:', JSON.stringify(body, null, 2));

    const {
      resCd,
      resMsg,
      shopOrderNo,
      ordNo,
      amount,
      authDate,
      authTime,
      payMethodType,
      authorizationId, // Authorization ID from EasyPay
      // Add other fields that EasyPay sends in the callback
    } = body;

    console.log('Extracted values:', { shopOrderNo, resCd, resMsg, authorizationId });

    // Return an HTML page that closes the popup and notifies parent
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Processing...</title>
</head>
<body>
  <script>
    const paymentData = ${JSON.stringify({
      resCd,
      resMsg,
      shopOrderNo,
      ordNo,
      amount,
      authDate,
      authTime,
      payMethodType,
      authorizationId
    })};

    console.log('Payment callback data:', paymentData);

    if (window.opener) {
      // Send message to parent window
      window.opener.postMessage({
        type: 'PAYMENT_CALLBACK',
        data: paymentData
      }, window.location.origin);

      // Close this popup after a brief delay
      setTimeout(() => {
        window.close();
      }, 1000);
    } else {
      // Not in popup, redirect to callback page with parameters
      const params = new URLSearchParams(paymentData);
      window.location.href = '/payment/callback?' + params.toString();
    }
  </script>
  <div style="text-align: center; padding: 50px; font-family: sans-serif;">
    <h2>결제 처리 중...</h2>
    <p>잠시만 기다려주세요.</p>
  </div>
</body>
</html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Payment callback error:', error);

    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Error</title>
</head>
<body>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'PAYMENT_ERROR',
        message: '결제 처리 중 오류가 발생했습니다.'
      }, window.location.origin);
      setTimeout(() => window.close(), 2000);
    }
  </script>
  <div style="text-align: center; padding: 50px; font-family: sans-serif;">
    <h2>오류가 발생했습니다</h2>
    <p>${error instanceof Error ? error.message : '알 수 없는 오류'}</p>
  </div>
</body>
</html>
    `;

    return new Response(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
}

/**
 * GET /api/payment/callback
 *
 * Handles the payment return URL (when EasyPay redirects the user back).
 * This is for client-side redirects after payment completion.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  console.log('=== GET /api/payment/callback ===');
  console.log('Full URL:', request.url);
  console.log('Search params:', searchParams.toString());

  // Log all parameters
  const allParams: { [key: string]: string | null } = {};
  searchParams.forEach((value, key) => {
    allParams[key] = value;
  });
  console.log('All GET parameters:', allParams);
  console.log('===================================');

  const resCd = searchParams.get('resCd');
  const resMsg = searchParams.get('resMsg');
  const shopOrderNo = searchParams.get('shopOrderNo');

  // Build redirect URL with query parameters - redirect to callback page, not payment page
  const redirectUrl = new URL('/payment/callback', request.url);

  if (resCd) redirectUrl.searchParams.set('resCd', resCd);
  if (resMsg) redirectUrl.searchParams.set('resMsg', resMsg);
  if (shopOrderNo) redirectUrl.searchParams.set('shopOrderNo', shopOrderNo);

  console.log('Redirecting to:', redirectUrl.toString());

  // Redirect to the callback page which will handle the payment result
  return NextResponse.redirect(redirectUrl);
}
