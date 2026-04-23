export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createHitlRequest } from '@/lib/requests';

// Temporary: test POST request creation bypassing middleware
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createHitlRequest({ body });

    if ('error' in result) {
      return NextResponse.json(
        { success: false, error: result.error, code: result.code },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json(
      { success: false, error: message, stack, code: 'unhandled_error' },
      { status: 500 }
    );
  }
}
