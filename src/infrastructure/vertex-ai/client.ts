import { VertexAI } from '@google-cloud/vertexai';

/**
 * Vertex AI Gemini client for LLM transformations
 * Used for Extract → Synthesize pipeline to generate AssetCards
 *
 * - On Cloud Run: uses Application Default Credentials (ADC). No GEMINI_API_KEY needed.
 *   Ensure GOOGLE_CLOUD_PROJECT and VERTEX_AI_LOCATION are set; service account needs roles/aiplatform.user.
 * - Local: set GOOGLE_APPLICATION_CREDENTIALS or run `gcloud auth application-default login`.
 */

let vertexAI: VertexAI | null = null;

function getVertexAI(): VertexAI {
  if (!vertexAI) {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_AI_LOCATION;
    if (!project || !location) {
      throw new Error(
        'GOOGLE_CLOUD_PROJECT and VERTEX_AI_LOCATION are required for Vertex AI (Cloud Run uses ADC; no GEMINI_API_KEY needed)'
      );
    }
    vertexAI = new VertexAI({ project, location });
  }
  return vertexAI;
}

export interface GenerateContentOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
}

/**
 * Generate content using Vertex AI Gemini (ADC on Cloud Run)
 */
export async function generateContent(options: GenerateContentOptions): Promise<string> {
  const ai = getVertexAI();
  const modelName = options.model || process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash';

  const generativeModel = ai.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2048,
    },
    ...(options.systemInstruction && {
      systemInstruction: {
        role: 'system',
        parts: [{ text: options.systemInstruction }],
      },
    }),
  });

  const result = await generativeModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
  });

  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No content generated from Vertex AI');
  }

  return text;
}
