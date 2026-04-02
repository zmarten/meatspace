import { NextResponse } from 'next/server';
import { getServiceStatus } from '@/lib/capacity';

// GET /api/status — public, no auth required
// Agents should check this before submitting requests
export async function GET() {
  const status = await getServiceStatus();

  return NextResponse.json(status, {
    headers: {
      'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
      'Access-Control-Allow-Origin': '*',
    },
  });
}
