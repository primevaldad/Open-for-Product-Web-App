
// Genkit is not installed. This is a comprehensive stub to prevent build errors.
// To enable AI flows, install: npm install genkit @genkit-ai/googleai

type AnyFn = (...args: any[]) => any;

const noopFlow = (..._args: any[]) => async (..._innerArgs: any[]) => ({ output: null, text: '' });
const noopPrompt = (..._args: any[]) => async (..._innerArgs: any[]) => ({ output: null, text: () => '' });

export const ai = {
  defineFlow: noopFlow as AnyFn,
  definePrompt: noopPrompt as AnyFn,
  generate: (..._args: any[]) => Promise.resolve({ text: () => '' }),
};
