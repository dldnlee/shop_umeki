import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * PATCH /api/payment/delivery-fee/[id]
 *
 * Updates the delivery_fee_payment status for an international order
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await request.json();
    const { paymentId, status } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing order ID' },
        { status: 400 }
      );
    }

    // Log payment details
    console.log('Updating delivery fee payment:', {
      orderId,
      paymentId,
      status,
    });

    // Update the order's delivery_fee_payment status
    const { data, error } = await supabase
      .from('umeki_orders_hypetown')
      .update({
        delivery_fee_payment: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating delivery fee payment:', error);
      return NextResponse.json(
        { error: 'Failed to update delivery fee payment', details: error },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery fee payment updated successfully',
      data,
    });

  } catch (error) {
    console.error('Delivery fee payment update error:', error);
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
 * GET /api/payment/delivery-fee/[id]
 *
 * Retrieves the delivery fee payment status for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing order ID' },
        { status: 400 }
      );
    }

    // Fetch order delivery fee payment status
    const { data, error } = await supabase
      .from('umeki_orders_hypetown')
      .select('id, delivery_fee_payment, updated_at')
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('Error fetching delivery fee payment status:', error);
      return NextResponse.json(
        { error: 'Failed to fetch delivery fee payment status', details: error },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('Delivery fee payment status fetch error:', error);
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
