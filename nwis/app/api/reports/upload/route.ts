import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided.' },
        { status: 400 }
      );
    }

    // Simulate backend processing time
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
