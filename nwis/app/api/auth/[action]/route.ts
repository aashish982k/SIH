import { NextResponse } from 'next/server';

const allowed = new Set(['login', 'register', 'me', 'logout']);

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!allowed.has(action) || action === 'me') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (action === 'logout') {
    const result = NextResponse.json({ success: true, message: 'Logged out' });
    result.cookies.set('nwis_token', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
    result.cookies.set('nwis_role', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
    return result;
  }
  return proxy(request, action);
}

export async function GET(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (action !== 'me') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return proxy(request, action);
}

async function proxy(request: Request, action: string) {
  try {
    const backendUrl = process.env.API_URL || 'http://localhost:5000/api';
    const response = await fetch(`${backendUrl}/auth/${action}`, {
      method: request.method,
      headers: { 'Content-Type': 'application/json', Authorization: request.headers.get('Authorization') || '' },
      body: request.method === 'GET' ? undefined : await request.text(),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({ error: 'Backend error' }));
    const result = NextResponse.json(payload, { status: response.status });
    const token = payload?.data?.token;
    const role = payload?.data?.user?.role;
    if (token) {
      result.cookies.set('nwis_token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
      if (role) {
        result.cookies.set('nwis_role', role === 'administrator' ? 'admin' : role, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
      }
    }
    return result;
  } catch {
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 502 });
  }
}
