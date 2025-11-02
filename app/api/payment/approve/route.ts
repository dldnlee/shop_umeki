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
    const { shopOrderNo, amount, authorizationId } = body;

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

    if (!authorizationId) {
      return NextResponse.json(
        { error: 'Missing authorization ID' },
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

    // EasyPay Query/Status Check API endpoint (for WebPay)
    // WebPay payments are automatically approved by EasyPay after user completes payment
    // We just need to query the status to verify it was successful
    // Note: The exact endpoint may vary - common endpoints are:
    // - /api/trades/approval (for manual approval)
    // - /api/trades/query (for status query)
    // - /api/ep9/trades/issue (for WebPay status check)
    const approvalUrl = `${process.env.EASYPAY_API_URL}/api/ep9/trades/approval`;

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const approvalReqDate = `${yyyy}${mm}${dd}`;
    const shopTransactionId = `${approvalReqDate}${Math.floor(Math.random()*1e9)}`;

    // Prepare approval/query request
    // Note: EasyPay may require the API key in different formats depending on their API version
    // Common formats: in body as 'apiKey', in header as 'Authorization', or in header as custom field
    const approvalBody = {
      mallId: mallId,
      shopOrderNo: shopOrderNo,
      shopTransactionId: shopTransactionId,
      approvalReqDate: approvalReqDate,
      authorizationId: authorizationId,
    };

    // Call EasyPay Approval API
    console.log('Calling EasyPay Approval API:', approvalUrl);
    console.log('Approval request body:', JSON.stringify({ ...approvalBody, apiKey: '[REDACTED]' }, null, 2));

    const approvalRes = await fetch(approvalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Charset': 'UTF-8'
      },
      body: JSON.stringify(approvalBody),
    });

    const approvalData = await approvalRes.json();

    console.log('EasyPay approval response status:', approvalRes.status);
    console.log('EasyPay approval response data:', JSON.stringify(approvalData, null, 2));

    // Check if approval was successful
    if (!approvalRes.ok || approvalData?.resCd !== '0000') {
      console.error('EasyPay approval failed:', approvalData);

      // Special handling for R102 error - try query endpoint as fallback
      if (approvalData?.resCd === 'R102') {
        console.error('R102 Error - Invalid authorization or missing parameters');
        console.error('Request details:', {
          mallId: mallId,
          shopOrderNo: shopOrderNo,
          authorizationId: authorizationId,
          hasApiKey: !!apiKey
        });

        // Try querying payment status instead (WebPay may not need explicit approval)
        console.log('Attempting to query payment status instead...');
        const queryUrl = `${process.env.EASYPAY_API_URL}/api/trades/query`;

        const queryBody = {
          mallId: mallId,
          shopOrderNo: shopOrderNo,
          apiKey: apiKey,
        };

        const queryRes = await fetch(queryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Charset': 'UTF-8',
            'Authorization': apiKey,
            'apiKey': apiKey,
          },
          body: JSON.stringify(queryBody),
        });

        const queryData = await queryRes.json();
        console.log('Query response:', queryData);

        // If query succeeds, use that data
        if (queryRes.ok && queryData?.resCd === '0000') {
          console.log('Payment query successful, using query data');
          // Return query data as approval data
          return NextResponse.json({
            success: true,
            data: {
              shopOrderNo: queryData.shopOrderNo,
              paymentId: queryData.paymentId || queryData.ordNo,
              amount: queryData.amount,
              authDate: queryData.authDate,
              authTime: queryData.authTime,
              payMethodType: queryData.payMethodType,
              payMethodTypeName: queryData.payMethodTypeName,
            },
            message: 'Payment verified successfully (via query)'
          });
        }

        // If both approval and query fail, return detailed error
        return NextResponse.json(
          {
            success: false,
            error: 'Payment approval failed',
            message: 'R102: 승인 요청 파라미터 오류 또는 인증 실패. authorizationId를 확인하거나 EASYPAY_API_KEY 설정을 확인하세요.',
            code: approvalData?.resCd,
            details: approvalData,
            queryAttempt: queryData,
            troubleshooting: {
              checkApiKey: 'EASYPAY_API_KEY 환경 변수가 올바르게 설정되었는지 확인하세요',
              checkAuthId: 'authorizationId가 결제 콜백에서 올바르게 전달되었는지 확인하세요',
              checkMallId: 'EASYPAY_MALL_ID가 올바른지 확인하세요',
              checkApiUrl: 'EASYPAY_API_URL이 테스트/운영 환경에 맞는지 확인하세요',
              note: 'WebPay의 경우 자동 승인되므로 승인 API 대신 조회 API를 사용해야 할 수 있습니다'
            }
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Payment approval failed',
          message: approvalData?.resMsg || 'Unknown error',
          code: approvalData?.resCd,
          details: approvalData
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
