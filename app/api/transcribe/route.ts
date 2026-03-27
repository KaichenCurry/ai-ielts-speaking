import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import type { TranscriptionResponse } from "@/lib/types";

const OPENAI_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!checkRateLimit(user.id, "transcribe", 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Transcription service is not configured." }, { status: 500 });
    }

    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    if (!audio.type.startsWith("audio/")) {
      return NextResponse.json({ error: "Uploaded file must be an audio file." }, { status: 400 });
    }

    if (audio.size === 0 || audio.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Audio file size must be between 1 byte and 25MB." },
        { status: 400 },
      );
    }

    const upstreamForm = new FormData();
    upstreamForm.append("file", audio, audio.name || "recording.webm");
    upstreamForm.append("model", "whisper-1");

    const upstreamResponse = await fetch(OPENAI_TRANSCRIPTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstreamForm,
    });

    if (!upstreamResponse.ok) {
      const upstreamText = await upstreamResponse.text();
      console.error("OpenAI transcription failed:", upstreamText);

      return NextResponse.json(
        { error: "OpenAI transcription failed. Please try again." },
        { status: 502 },
      );
    }

    const data = (await upstreamResponse.json()) as { text?: string };
    const transcript = data.text?.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: "ASR returned an empty transcript." },
        { status: 502 },
      );
    }

    const response: TranscriptionResponse = {
      transcript,
      provider: "openai",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to transcribe audio." }, { status: 500 });
  }
}
