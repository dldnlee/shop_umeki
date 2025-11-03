import { NextRequest, NextResponse } from 'next/server';
import { sendPayPalPendingEmail, type OrderEmailData } from '@/lib/email';

/**
 * POST /api/email/send-paypal-pending
 *
 * Send PayPal pending payment email to customer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { orderId, customerName, customerEmail, orderDate, items, totalAmount, deliveryMethod, address, phoneNum, paypalEmail } = body;

    if (!orderId || !customerName || !customerEmail || !orderDate || !items || !totalAmount || !deliveryMethod || !paypalEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Prepare email data
    const emailData: OrderEmailData = {
      orderId,
      customerName,
      customerEmail,
      orderDate,
      items,
      totalAmount,
      deliveryMethod,
      address: address || null,
      phoneNum: phoneNum || null,
    };

    // Send email
    const result = await sendPayPalPendingEmail(emailData, paypalEmail);

    if (!result.success) {
      console.error('Email sending failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in send-paypal-pending API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
