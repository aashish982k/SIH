import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const backendUrl = process.env.API_URL || 'http://localhost:5000/api';
    const token = request.headers.get('Authorization') || `Bearer ${request.headers.get('cookie')?.match(/(?:^|; )nwis_token=([^;]+)/)?.[1] || ''}`;
    const response = await fetch(`${backendUrl}/reports/stats/global`, { headers: { Authorization: token }, cache: 'no-store' });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Report statistics unavailable' }, { status: 502 });
  }
}
