import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const backendUrl = process.env.API_URL || 'http://localhost:5000/api';
    const token = (await cookies()).get('nwis_token')?.value;
    const response = await fetch(`${backendUrl}/reports`, {
      headers: {
        Authorization: request.headers.get('Authorization') || (token ? `Bearer ${token}` : ''),
      },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({ error: 'Backend error' }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error('Reports request failed:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
