'use server';

/**
 * @fileOverview Suggests relevant next steps and connects contributors with matching opportunities based on their skills, interests, and the project's needs.
 *
 * - suggestNextSteps - A function that suggests next steps for project contributors.
 * - SuggestNextStepsInput - The input type for the suggestNextSteps function.
 * - SuggestNextStepsOutput - The return type for the suggestNextSteps function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestNextStepsInputSchema = z.object({
  userSkills: z
    .array(z.string())
    .describe('A list of the user skills and expertise.'),
  projectNeeds: z
    .string()
    .describe('A description of the project needs and goals.'),
  userInterests: z
    .string()
    .describe('A description of the users interests.'),
  projectProgress: z
    .string()
    .describe('A summary of the project progress and discussions.'),
});
type SuggestNextStepsInput = z.infer<typeof SuggestNextStepsInputSchema>;

const SuggestNextStepsOutputSchema = z.object({
  suggestedNextSteps: z
    .array(z.string())
    .describe('A list of suggested next steps for the project.'),
  matchingOpportunities: z
    .array(z.string())
    .describe('A list of matching opportunities for the user.'),
});
type SuggestNextStepsOutput = z.infer<typeof SuggestNextStepsOutputSchema>;

export async function suggestNextSteps(input: SuggestNextStepsInput): Promise<SuggestNextStepsOutput> {
  return suggestNextStepsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestNextStepsPrompt',
  input: {schema: SuggestNextStepsInputSchema},
  output: {schema: SuggestNextStepsOutputSchema},
  prompt: `You are an AI assistant helping project contributors find relevant next steps and matching opportunities.

  Based on the user's skills, interests, the project's needs, and the project's progress, suggest next steps and matching opportunities for the user.

  User Skills: {{userSkills}}
  Project Needs: {{projectNeeds}}
  User Interests: {{userInterests}}
  Project Progress: {{projectProgress}}

  Suggest next steps for the project and matching opportunities for the user.
  `,
});

const suggestNextStepsFlow = ai.defineFlow(
  {
    name: 'suggestNextStepsFlow',
    inputSchema: SuggestNextStepsInputSchema,
    outputSchema: SuggestNextStepsOutputSchema,
  },
  async input => {
    try {
        const {output} = await prompt(input);
        return output!;
    } catch (e) {
        if (e instanceof Error && e.message.includes('Generative Language API has not been used')) {
            throw new Error('AI_SERVICE_DISABLED');
        }
        throw e;
    }
  }
);
