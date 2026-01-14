import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/orders";
import { CartItem } from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import { sendDiscordMessage } from "@/lib/discord";
import { formatKRW } from "@/lib/utils";


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

  // Idempotency check: If order already exists with this toss_payment_id, return success
  // This prevents duplicate orders when users refresh or retry
  const { data: existingOrder } = await supabase
    .from("umeki_orders")
    .select("id")
    .eq("toss_payment_id", paymentKey)
    .single();

  if (existingOrder) {
    console.log('Order already exists for payment key:', paymentKey);
    return NextResponse.json({
      success: true,
      orderId: existingOrder.id,
      message: 'Order already processed',
    });
  }

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

    // Deduct inventory after successful order creation
    try {
      const inventoryRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/inventory/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems: cartItems,
        }),
      });

      const inventoryData = await inventoryRes.json();
      if (!inventoryData.success) {
        console.error('Failed to deduct inventory:', inventoryData.error);
        // Don't fail the order if inventory deduction fails, just log it
      }
    } catch (inventoryError) {
      console.error('Error deducting inventory:', inventoryError);
      // Don't fail the order if inventory deduction fails
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

    // Send Discord notification for new orders
    if (orderResult.data?.order && orderResult.data?.items) {
      try {
        const items = orderResult.data.items.map((item) => {
          const cartItem = (cartItems as CartItem[]).find((ci: CartItem) =>
            ci.productId === item.product_id &&
            (ci.option || null) === (item.option || null)
          );
          return `- ${cartItem?.productName || item.product_name || 'Unknown'}${item.option ? ` (${item.option})` : ''} x${item.quantity} - ${formatKRW(item.total_price)}`;
        }).join('\n') || 'No items';

        const message = `🛒 **새로운 주문이 들어왔습니다!**\n\n` +
          `**주문번호:** ${orderResult.data.order.id}\n` +
          `**결제 수단:** Toss\n` +
          `**총 금액:** ${formatKRW(orderResult.data.order.total_amount)}\n\n` +
          `**고객 정보:**\n` +
          `- 이름: ${orderResult.data.order.name || 'N/A'}\n` +
          `- 이메일: ${orderResult.data.order.email || 'N/A'}\n` +
          `- 전화번호: ${orderResult.data.order.phone_num || 'N/A'}\n\n` +
          `**주문 상품:**\n${items}\n\n` +
          `**주문 시간:** ${new Date().toLocaleString('ko-KR')}`;

        await sendDiscordMessage({ message });
      } catch (discordError) {
        // Log Discord error but don't fail the order
        console.error('Failed to send Discord notification:', discordError);
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