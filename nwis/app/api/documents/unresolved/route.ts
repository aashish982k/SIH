import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const token = (await cookies()).get('nwis_token')?.value;
    const backendUrl = process.env.API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${backendUrl}/documents/unresolved`, {
      headers: { Authorization: request.headers.get('Authorization') || (token ? `Bearer ${token}` : '') },
      cache: 'no-store',
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Document service unavailable' }, { status: 502 });
  }
}
