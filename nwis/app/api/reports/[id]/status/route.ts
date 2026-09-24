import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const backendUrl = process.env.API_URL || 'http://localhost:5000/api';
    const token = (await cookies()).get('nwis_token')?.value;
    const response = await fetch(`${backendUrl}/reports/${id}/status`, {
      headers: { Authorization: request.headers.get('Authorization') || (token ? `Bearer ${token}` : '') },
      cache: 'no-store',
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Report status unavailable' }, { status: 502 });
  }
}
