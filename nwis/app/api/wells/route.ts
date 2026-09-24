import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const backendUrl = process.env.API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${backendUrl}/wells`, {
      method: 'GET',
      headers: {
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Backend error' }));
      return NextResponse.json(err, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
