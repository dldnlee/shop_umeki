import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateOrderStatus, getOrderById } from '@/lib/orders';
import { sendPaymentConfirmedEmail, OrderEmailData } from '@/lib/email';

export async function PATCH(
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
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Get the current order to check old status
    const orderResult = await getOrderById(id);
    if (!orderResult.success || !orderResult.data) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const oldStatus = orderResult.data.order.order_status;

    // Update the order status
    const result = await updateOrderStatus(id, status);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    // If status changed from 'waiting' to 'paid', send payment confirmation email
    if (oldStatus === 'waiting' && status === 'paid') {
      console.log('Order status changed from waiting to paid, sending payment confirmation email');

      const order = orderResult.data.order;
      const items = orderResult.data.items;

      // Prepare email data
      const emailData: OrderEmailData = {
        orderId: order.id!,
        customerName: order.name,
        customerEmail: order.email,
        orderDate: new Date(order.created_at!).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        items: items.map((item: any) => ({
          productName: item.product_name || `상품 #${item.product_id}`,
          productOption: item.option || undefined,
          quantity: item.quantity,
          totalPrice: item.total_price,
        })),
        totalAmount: order.total_amount,
        deliveryMethod: order.delivery_method,
        address: order.address,
        phoneNum: order.phone_num,
      };

      // Send the email (don't wait for it to complete)
      sendPaymentConfirmedEmail(emailData).then((emailResult) => {
        if (emailResult.success) {
          console.log('Payment confirmation email sent successfully');
        } else {
          console.error('Failed to send payment confirmation email:', emailResult.error);
        }
      }).catch((err) => {
        console.error('Error sending payment confirmation email:', err);
      });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
