import { NextRequest, NextResponse } from 'next/server';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const { prompt, history } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const context = `You are a Gemini 2.5 Flash assistant helping users understand maritime intelligence report templates. They are viewing an empty template summary and may need guidance on how to populate it, what sections typically include, and how to interpret data from generated reports.`;

    const baseMessage = {
      role: 'user',
      parts: [{ text: context }],
    };

    const historyMessages = Array.isArray(history)
      ? history
          .filter((entry: any) => entry && typeof entry.content === 'string')
          .map((entry: any) => ({
            role: entry.role === 'user' ? 'user' : 'model',
            parts: [{ text: entry.content }],
          }))
      : [];

    const payload = {
      contents: [
        baseMessage,
        ...historyMessages,
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    };

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Gemini request failed: ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      'I was unable to generate a response right now.';

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Template support agent error', error);
    return NextResponse.json(
      { error: error?.message ?? 'Unexpected server error' },
      { status: 500 }
    );
  }
}


