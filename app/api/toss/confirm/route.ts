import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/orders";
import { CartItem } from "@/lib/cart";


const widgetSecretKey = process.env.TOSS_SECRET_KEY;
const encryptedWidgetSecretKey = "Basic " + Buffer.from(widgetSecretKey + ":").toString("base64");


/**
 * POST /api/toss/confirm
 *
 * Confirms payment from widget with toss payments
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { paymentKey, orderId, amount, orderData, cartItems } = body;

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
  console.log('Toss payment confirmation result:', result);

  if (!response.ok) {
    // 결제 승인 실패
    console.error('Toss payment confirmation failed:', result);
    return NextResponse.json(result, { status: response.status });
  }

  // 결제 완료 - 주문 생성
  try {
    // Prepare order data with Toss payment info
    const completeOrderData = {
      ...orderData,
      payment_method: 'toss',
      toss_payment_id: paymentKey, // Store Toss payment key in easy_pay_id field
    };

    // Create order in database
    const orderResult = await createOrder(completeOrderData, cartItems as CartItem[]);

    if (!orderResult.success) {
      console.error('Failed to create order:', orderResult.error);
      return NextResponse.json(
        {
          success: false,
          error: 'Order creation failed',
          message: orderResult.error && typeof orderResult.error === 'object' && 'message' in orderResult.error
            ? String(orderResult.error.message)
            : '주문 생성 중 오류가 발생했습니다'
        },
        { status: 500 }
      );
    }

    // Send order confirmation email
    if (orderResult.data?.order && orderResult.data?.items) {
      try {
        // Format order date
        const orderDate = new Date(orderResult.data.order.created_at).toLocaleString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        // Send email via API route
        const emailRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/email/send-order-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderResult.data.order.id,
            customerName: orderResult.data.order.name,
            customerEmail: orderResult.data.order.email,
            orderDate: orderDate,
            items: orderResult.data.items.map((item) => {
              // Find the corresponding cart item by matching product_id and option
              const cartItem = (cartItems as CartItem[]).find((ci: CartItem) =>
                ci.productId === item.product_id &&
                (ci.option || null) === (item.option || null)
              );
              return {
                productName: cartItem?.productName || 'Unknown Product',
                productOption: item.option,
                quantity: item.quantity,
                totalPrice: item.total_price,
              };
            }),
            totalAmount: orderResult.data.order.total_amount,
            deliveryMethod: orderResult.data.order.delivery_method,
            address: orderResult.data.order.address,
            phoneNum: orderResult.data.order.phone_num,
          }),
        });

        const emailData = await emailRes.json();
        if (emailData.success) {
          console.log('Order confirmation email sent successfully');
        } else {
          console.error('Failed to send email:', emailData.error);
        }
      } catch (emailError) {
        // Log email error but don't fail the order
        console.error('Failed to send order confirmation email:', emailError);
      }
    }

    // Return success with order info
    return NextResponse.json({
      success: true,
      orderId: orderResult.data?.order.id,
      paymentData: result,
    });
  } catch (error) {
    console.error('Unexpected error in order creation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error during order creation',
        message: error instanceof Error ? error.message : '예상치 못한 오류가 발생했습니다'
      },
      { status: 500 }
    );
  }
}