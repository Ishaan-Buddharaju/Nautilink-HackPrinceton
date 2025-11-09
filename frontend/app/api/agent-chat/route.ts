import { NextRequest, NextResponse } from 'next/server';
import { fishingZones } from '@/lib/fishingZones';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const { message, history } = await req.json();

    const zonesSummary = fishingZones
      .map((zone) => {
        const { lat, lng, name, vessel, sustainability_score } = zone;
        const categories = Object.entries(sustainability_score.categories)
          .map(([key, item]) => `${key.replace(/_/g, ' ')}: ${item.score}`)
          .join('; ');

        return [
          `Zone ID: ${zone.id}`,
          `Name: ${name}`,
          `Coordinates: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
          `Primary vessel: ${vessel.name} (IMO ${vessel.imo_number}), model ${vessel.model}, flag ${vessel.flag_state}, built ${vessel.year_built}`,
          `Overall sustainability score: ${sustainability_score.total_score} (grade ${sustainability_score.grade})`,
          `Category breakdown → ${categories}`,
        ].join('\n');
      })
      .join('\n\n');

    const systemPrompt = `
You are Nautilink’s maritime intelligence assistant. Answer the user using the structured fishing-zone dossier below.
If you cannot answer from the dossier, acknowledge the limitation.

Fishing-zone dossier:
${zonesSummary}
`;

    const conversationHistory = Array.isArray(history)
      ? history.map((entry: { role: string; content: string }) => ({
          role: entry.role === 'user' ? 'user' : 'model',
          parts: [{ text: entry.content }],
        }))
      : [];

    const payload = {
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemPrompt }],
      },
      contents: [
        ...conversationHistory,
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ],
    };

    const response = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Gemini request failed: ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      'I was unable to generate a response right now.';

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Gemini Agent API error', error);
    return NextResponse.json(
      { error: error?.message ?? 'Unexpected server error' },
      { status: 500 }
    );
  }
}


