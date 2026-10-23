import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { audioInputSchema } from "./audio-entry";
import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env['GEMINI_API_KEY'] || '';
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

// Public demo entry tool: transcribes one supplied clip, never reads account or ledger data.
export const transcribeEntry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => audioInputSchema.parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    try {
      const ai = getGemini();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-transcribe",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: data.mime || "audio/webm",
                data: data.audio,
              },
            },
            {
              text: "Transcribe this Indian kirana store audio recording exactly. Preserve vendor names, item names, numbers, and amounts in the language spoken (Hindi, Hinglish, English, etc.). Output only the plain text transcription.",
            },
          ],
        },
      });

      const text = response.text?.trim() || "";
      if (!text) {
        return { text: "", language: null, error: "No speech was heard. Try again, or type the details.", retryAfter: null };
      }
      return { text, language: "hi", error: null, retryAfter: null };
    } catch (error: any) {
      console.error("Gemini voice transcription error:", error?.message || error);
      return { text: "", language: null, error: "Voice reading is unavailable right now. You can type the details instead.", retryAfter: null };
    }
  });
