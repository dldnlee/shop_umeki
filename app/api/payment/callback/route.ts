import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/orders';

/**
 * POST /api/payment/callback
 *
 * Handles the payment callback from EasyPay after payment completion.
 * This endpoint should be called by EasyPay's server (server-to-server).
 *
 * EasyPay will send payment result data to this endpoint.
 * We need to verify the payment and create the order in our database.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the callback data from EasyPay
    const body = await request.json();

    const {
      resCd,
      resMsg,
      shopOrderNo,
      ordNo,
      amount,
      authDate,
      authTime,
      payMethodType,
      // Add other fields that EasyPay sends in the callback
    } = body;

    console.log('Payment callback received:', { shopOrderNo, resCd, resMsg });

    // Check if payment was successful
    if (resCd !== '0000') {
      console.error('Payment failed:', resMsg);
      return NextResponse.json({
        success: false,
        error: 'Payment failed',
        message: resMsg || 'Unknown error'
      }, { status: 400 });
    }

    // Verify the payment with EasyPay approval API (critical security step)
    const verificationRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shopOrderNo,
        amount,
      }),
    });

    const verificationData = await verificationRes.json();

    if (!verificationData.success) {
      console.error('Payment verification failed:', verificationData);
      return NextResponse.json({
        success: false,
        error: 'Payment verification failed',
        message: verificationData.message
      }, { status: 400 });
    }

    // Retrieve pending order data from the database or session
    // Note: In production, you should store pending orders in the database, not just sessionStorage
    // For now, we'll return success and let the client handle order creation

    return NextResponse.json({
      success: true,
      data: {
        shopOrderNo,
        paymentId: ordNo || verificationData.data?.paymentId,
        amount,
        authDate,
        authTime,
      },
      message: 'Payment verified successfully'
    });

  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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
  const resCd = searchParams.get('resCd');
  const resMsg = searchParams.get('resMsg');
  const shopOrderNo = searchParams.get('shopOrderNo');

  // Build redirect URL with query parameters
  const redirectUrl = new URL('/payment', request.url);

  if (resCd) redirectUrl.searchParams.set('resCd', resCd);
  if (resMsg) redirectUrl.searchParams.set('resMsg', resMsg);
  if (shopOrderNo) redirectUrl.searchParams.set('shopOrderNo', shopOrderNo);

  // Redirect to the payment page which will handle the callback
  return NextResponse.redirect(redirectUrl);
}
