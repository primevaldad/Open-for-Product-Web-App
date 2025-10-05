
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Create and export the main 'ai' object, passing all configuration directly to it.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
  // CORRECTED: Using the standard and likely correct model name
  model: 'googleai/gemini-1.5-pro',
});
