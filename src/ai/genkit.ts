
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Create and export the main 'ai' object, passing all configuration directly to it.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  // enableTracingAndMetrics: true, // Removed as it's not a valid property
  model: 'googleai/gemini-2.5-flash',
});
