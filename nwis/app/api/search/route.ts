import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backendUrl = process.env.API_URL || 'http://localhost:5000/api';
    const token = (await cookies()).get('nwis_token')?.value;
    const response = await fetch(`${backendUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || (token ? `Bearer ${token}` : ''),
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({ error: 'Backend error' }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error('Search proxy error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
