import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSalesAnalytics } from '@/lib/orders';

export async function GET() {
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

    const result = await getSalesAnalytics();

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch sales analytics' },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Fetch sales analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
