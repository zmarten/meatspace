import { NextResponse } from 'next/server';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
};

export function corsHeaders(extra?: Record<string, string>): Record<string, string> {
  return { ...CORS_HEADERS, ...extra };
}

export function withCors(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}

export function corsOptionsResponse(methods: string, allowHeaders: string): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': allowHeaders,
    },
  });
}
