import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const backendUrl = process.env.API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${backendUrl}/alerts/${id}/acknowledge`, {
      method: 'PATCH',
      headers: {
        'Authorization': request.headers.get('Authorization') || 'Bearer mock-token'
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
