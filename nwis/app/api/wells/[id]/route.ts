import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const backendUrl = process.env.API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${backendUrl}/wells/${encodeURIComponent(id)}`, {
      headers: { Authorization: request.headers.get('Authorization') || '' },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({ error: 'Backend error' }));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Well service unavailable' }, { status: 502 });
  }
}
