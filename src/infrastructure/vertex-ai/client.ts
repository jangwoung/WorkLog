import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Vertex AI Gemini client for LLM transformations
 * Used for Extract → Synthesize pipeline to generate AssetCards
 * 
 * Note: Using @google/generative-ai SDK which works with Vertex AI
 * when GOOGLE_APPLICATION_CREDENTIALS is set
 */

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_APPLICATION_CREDENTIALS environment variable is required');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export interface GenerateContentOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
}

/**
 * Generate content using Vertex AI Gemini
 * @param options Generation options
 * @returns Generated text content
 */
export async function generateContent(options: GenerateContentOptions): Promise<string> {
  const client = getGenAI();
  const modelName = options.model || process.env.VERTEX_AI_MODEL || 'gemini-1.5-pro';

  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2048,
    },
    ...(options.systemInstruction && {
      systemInstruction: options.systemInstruction,
    }),
  } as Parameters<typeof client.getGenerativeModel>[0]);

  const result = await model.generateContent(options.prompt);
  const response = await result.response;
  const text = response.text();

  if (!text) {
    throw new Error('No content generated from Vertex AI');
  }

  return text;
}
