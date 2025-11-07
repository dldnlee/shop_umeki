import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOrderById } from '@/lib/orders';
import { sendPaymentCancellationWarningEmail, OrderEmailData } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the order details
    const orderResult = await getOrderById(id);
    if (!orderResult.success || !orderResult.data) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.data.order;
    const items = orderResult.data.items;

    // Check if order is in waiting status
    if (order.order_status !== 'waiting') {
      return NextResponse.json(
        { error: 'Can only send warning for orders in waiting status' },
        { status: 400 }
      );
    }

    // Prepare email data
    const emailData: OrderEmailData = {
      orderId: order.id!,
      customerName: order.name,
      customerEmail: order.email,
      orderDate: new Date(order.created_at!).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      items: items.map((item: any) => ({
        productName: item.product_name || `Product #${item.product_id}`,
        productOption: item.option || undefined,
        quantity: item.quantity,
        totalPrice: item.total_price,
      })),
      totalAmount: order.total_amount,
      deliveryMethod: order.delivery_method,
      address: order.address,
      phoneNum: order.phone_num,
    };

    // Send the warning email
    const emailResult = await sendPaymentCancellationWarningEmail(emailData);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send warning email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment cancellation warning email sent successfully'
    });
  } catch (error) {
    console.error('Send warning email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
