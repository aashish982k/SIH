import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    if (!formData.get('file')) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    const backendUrl = process.env.API_URL || 'http://localhost:5000/api';
    const token = (await cookies()).get('nwis_token')?.value;
    const response = await fetch(`${backendUrl}/reports/upload`, {
      method: 'POST',
      body: formData,
      headers: { Authorization: request.headers.get('Authorization') || (token ? `Bearer ${token}` : '') },
    });
    const payload = await response.json().catch(() => ({ error: 'Backend error' }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
