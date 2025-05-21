import { NextResponse } from 'next/server';

/**
 * Simple API endpoint for connectivity checks
 * Returns a 200 OK status with current server time
 */
export async function GET() {
    return new Response(JSON.stringify({ 
        status: 'ok',
        timestamp: Date.now(),
        serverTime: new Date().toISOString()
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
    });
}

/**
 * HEAD request handler just returns status OK without body 
 */
export async function HEAD() {
    return new Response(null, {
        status: 200,
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
    });
}

export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Allow': 'GET, HEAD, OPTIONS'
    }
  });
}

// Set revalidation to 0 to prevent caching
export const dynamic = 'force-dynamic'; 