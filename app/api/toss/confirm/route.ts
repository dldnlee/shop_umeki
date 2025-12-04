import { NextRequest, NextResponse } from "next/server";


const widgetSecretKey = process.env.TOSS_SECRET_KEY;
const encryptedWidgetSecretKey = "Basic " + Buffer.from(widgetSecretKey + ":").toString("base64");


/**
 * POST /api/toss/confirm
 *
 * Confirms payment from widget with toss payments
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { paymentKey, orderId, amount } = body;

  // 결제 승인 API를 호출하세요.
  // 결제를 승인하면 결제수단에서 금액이 차감돼요.
  // @docs https://docs.tosspayments.com/guides/v2/payment-widget/integration#3-결제-승인하기
  const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: encryptedWidgetSecretKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId: orderId,
      amount: amount,
      paymentKey: paymentKey,
    }),
  });

  const result = await response.json();
  console.log(result);

  if (!response.ok) {
    // TODO: 결제 승인 실패 비즈니스 로직을 구현하세요.
    return NextResponse.json(result, { status: response.status });
  }

  // TODO: 결제 완료 비즈니스 로직을 구현하세요.
  return NextResponse.json(result, { status: response.status });
}