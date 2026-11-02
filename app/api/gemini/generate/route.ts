import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { zone = "Surface", depth = 100, promptType = "music" } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Graceful fallback prompt if API key not yet configured
      return NextResponse.json({
        prompt: `High-fidelity ${zone.toLowerCase()} audio prompt for Google AI Studio: ${
          zone === "Surface"
            ? "Energetic acoustic country banjo & guitar fingerpicking, resonant dobro slides, warm upright bass, 110 BPM, live studio acoustic session."
            : "Deep subterranean ambient cavern drone, 40Hz sub-bass reverberation, dripping water echoes, eerie crystal resonance, cinematic dark ambient."
        }`,
        tips: "Tip: Paste this prompt into Google AI Studio (Lyria / Gemini Audio) to generate live soundtrack audio!"
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const userPrompt = `You are an expert audio designer and music composer for high-end video games.
The player is exploring a game called Mining Empire at location "${zone}" at depth ${depth} feet.
Generate an ultra-high-fidelity, production-grade text-to-music generation prompt formatted specifically for Google AI Studio (using Lyria or Gemini Audio models).

The prompt should include:
1. Genre / Style (e.g. Upbeat Acoustic Country Folk for Surface, or Deep Dark Cavernous Drone Ambient for Cave).
2. Instrumentation details (specific guitars, tunings, synthesizers, sub-bass frequencies, acoustic percussion).
3. Mood, tempo (BPM), and mix characteristics (reverb space, analog warmth, mastering).
4. Keep the prompt under 3-4 sentences, punchy and highly effective for Google AI Studio music generation.

Respond with JSON:
{
  "title": "Short title",
  "prompt": "The exact prompt text to copy into Google AI Studio",
  "musicalNotes": "Brief 1-sentence tip on why this matches the environment"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: userPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text ?? "{}");
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      {
        title: "Mining Atmosphere Music Prompt",
        prompt: "Acoustic country folk track with fingerpicked guitars and dobro slides for a surface mining outpost, 110 BPM, warm analog mastering.",
        musicalNotes: "Authentic frontier exploration acoustic vibe."
      },
      { status: 200 }
    );
  }
}
