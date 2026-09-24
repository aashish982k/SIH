import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const backendUrl = process.env.API_URL || 'http://localhost:5000/api';
    const token = (await cookies()).get('nwis_token')?.value;
    const incoming = new URL(request.url);
    const response = await fetch(`${backendUrl}/knowledge?${incoming.searchParams}`, {
      headers: { Authorization: request.headers.get('Authorization') || (token ? `Bearer ${token}` : '') },
      cache: 'no-store',
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    console.error('Knowledge proxy error:', error);
    return NextResponse.json({ error: 'Knowledge service unavailable' }, { status: 502 });
  }
}
