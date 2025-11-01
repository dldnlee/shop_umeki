import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/payment/approve
 *
 * Verifies and approves a payment transaction with EasyPay.
 * This is the critical server-side verification step that should be called
 * after the user completes payment to ensure the payment is legitimate.
 *
 * EasyPay Approval API endpoint: /api/trades/approval
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopOrderNo, amount } = body;

    // Validate required fields
    if (!shopOrderNo) {
      return NextResponse.json(
        { error: 'Missing shop order number' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get EasyPay configuration
    const mallId = process.env.EASYPAY_MALL_ID;
    const apiKey = process.env.EASYPAY_API_KEY;

    if (!mallId || !apiKey) {
      console.error('EasyPay configuration missing');
      return NextResponse.json(
        { error: 'Payment system configuration error' },
        { status: 500 }
      );
    }

    // EasyPay Approval API endpoint
    const approvalUrl = `${process.env.EASYPAY_API_URL}/api/trades/approval`;

    // Prepare approval request
    const approvalBody = {
      mallId: mallId,
      shopOrderNo: shopOrderNo,
      amount: amount,
      // Add authentication headers or parameters as required by EasyPay
      // This may include API keys, signatures, or other authentication methods
    };

    // Call EasyPay Approval API
    const approvalRes = await fetch(approvalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Charset': 'UTF-8',
        // Add any required authentication headers
        // 'Authorization': `Bearer ${apiKey}`, // Example - adjust based on EasyPay docs
      },
      body: JSON.stringify(approvalBody),
    });

    const approvalData = await approvalRes.json();

    // Check if approval was successful
    if (!approvalRes.ok || approvalData?.resCd !== '0000') {
      console.error('EasyPay approval failed:', approvalData);
      return NextResponse.json(
        {
          success: false,
          error: 'Payment approval failed',
          message: approvalData?.resMsg || 'Unknown error',
          code: approvalData?.resCd
        },
        { status: 400 }
      );
    }

    // Return approval data
    return NextResponse.json({
      success: true,
      data: {
        shopOrderNo: approvalData.shopOrderNo,
        paymentId: approvalData.paymentId || approvalData.ordNo,
        amount: approvalData.amount,
        authDate: approvalData.authDate,
        authTime: approvalData.authTime,
        payMethodType: approvalData.payMethodType,
        payMethodTypeName: approvalData.payMethodTypeName,
        // Include other relevant fields from the approval response
      },
      message: 'Payment approved successfully'
    });

  } catch (error) {
    console.error('Payment approval error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payment/approve?shopOrderNo=xxx
 *
 * Queries the payment status from EasyPay.
 * Useful for checking payment status or retrieving transaction details.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shopOrderNo = searchParams.get('shopOrderNo');

    if (!shopOrderNo) {
      return NextResponse.json(
        { error: 'Missing shop order number' },
        { status: 400 }
      );
    }

    // Get EasyPay configuration
    const mallId = process.env.EASYPAY_MALL_ID;

    if (!mallId) {
      console.error('EasyPay merchant ID not configured');
      return NextResponse.json(
        { error: 'Payment system configuration error' },
        { status: 500 }
      );
    }

    // EasyPay Query API endpoint (adjust based on actual EasyPay API)
    const queryUrl = `${process.env.EASYPAY_API_URL}/api/trades/query`

    const queryBody = {
      mallId: mallId,
      shopOrderNo: shopOrderNo,
    };

    const queryRes = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Charset': 'UTF-8',
      },
      body: JSON.stringify(queryBody),
    });

    const queryData = await queryRes.json();

    if (!queryRes.ok || queryData?.resCd !== '0000') {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to query payment status',
          message: queryData?.resMsg || 'Unknown error'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: queryData,
    });

  } catch (error) {
    console.error('Payment query error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
