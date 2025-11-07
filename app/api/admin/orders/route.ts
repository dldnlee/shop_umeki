import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllOrders } from '@/lib/orders';

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const orderId = searchParams.get('order_id') || undefined;
    const name = searchParams.get('name') || undefined;
    const email = searchParams.get('email') || undefined;
    const sort = searchParams.get('sort') as 'asc' | 'desc' | null;

    const result = await getAllOrders({
      status,
      orderId,
      name,
      email,
      sortOrder: sort || 'desc'
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
