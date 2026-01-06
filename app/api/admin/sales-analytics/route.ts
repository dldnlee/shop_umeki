import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSalesAnalytics } from '@/lib/orders';

export const dynamic = 'force-dynamic';

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
      console.error('Sales analytics query failed:', result.error);
      const errorMessage =
        (result.error as { message?: string | undefined })?.message ||
        'Failed to fetch sales analytics';
      return NextResponse.json(
        { error: errorMessage },
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
