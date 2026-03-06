import { NextResponse } from 'next/server';

export function withSecurityHeaders(response: NextResponse) {
  // API-specific security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  
  // Remove server information
  response.headers.delete('X-Powered-By');
  
  return response;
}

// Helper function to create secure API response
export function createSecureApiResponse(data: any, status: number = 200) {
  const response = NextResponse.json(data, { status });
  return withSecurityHeaders(response);
}