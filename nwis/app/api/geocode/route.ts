import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '5');
    const response = await fetch(url, { headers: { 'User-Agent': 'NWIS/1.0 location search' }, next: { revalidate: 60 } });
    if (!response.ok) return NextResponse.json({ error: 'Location search failed' }, { status: 502 });
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: 'Location service unavailable' }, { status: 502 });
  }
}
