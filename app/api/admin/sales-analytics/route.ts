import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSalesAnalytics } from '@/lib/orders';

export async function GET(request: Request) {
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

    // Parse query parameters for date range
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const result = await getSalesAnalytics(
      startDate || undefined,
      endDate || undefined
    );

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
