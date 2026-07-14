import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  console.warn('Google Generative AI API key is missing. Vector embeddings will not be generated.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Generates an embedding vector for the given text using text-embedding-004.
 * Returns null if the API key is missing or the API call fails.
 */
export async function generateProjectEmbedding(text: string): Promise<number[] | null> {
  if (!genAI || !text.trim()) return null;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
      outputDimensionality: 768,
    } as any);
    return result.embedding.values;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    return null;
  }
}
