'use server';

/**
 * @fileOverview This file defines a Genkit flow to highlight potential blockers or dependencies in a project.
 *
 * - highlightProjectBlockers - A function that initiates the blocker identification flow.
 * - HighlightProjectBlockersInput - The input type for the highlightProjectBlockers function.
 * - HighlightProjectBlockersOutput - The return type for the highlightProjectBlockers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HighlightProjectBlockersInputSchema = z.object({
  projectDiscussions: z
    .string()
    .describe('The text content of the project discussions.'),
  taskBoardActivity: z
    .string()
    .describe('The text content of the task board activity.'),
});

type HighlightProjectBlockersInput = z.infer<
  typeof HighlightProjectBlockersInputSchema
>;

const HighlightProjectBlockersOutputSchema = z.object({
  potentialBlockers: z
    .array(z.string())
    .describe('A list of potential blockers identified.'),
  dependencies: z
    .array(z.string())
    .describe('A list of identified dependencies.'),
  summary: z
    .string()
    .describe('A summary of the identified blockers and dependencies.'),
});

type HighlightProjectBlockersOutput = z.infer<
  typeof HighlightProjectBlockersOutputSchema
>;

export async function highlightProjectBlockers(
  input: HighlightProjectBlockersInput
): Promise<HighlightProjectBlockersOutput> {
  return highlightProjectBlockersFlow(input);
}

const highlightProjectBlockersPrompt = ai.definePrompt({
  name: 'highlightProjectBlockersPrompt',
  input: {schema: HighlightProjectBlockersInputSchema},
  output: {schema: HighlightProjectBlockersOutputSchema},
  prompt: `You are an AI assistant helping project leads identify potential blockers and dependencies in their projects. Analyze the following project discussions and task board activity to identify potential blockers and dependencies. Provide a summary of the identified blockers and dependencies.

Project Discussions:
{{projectDiscussions}}

Task Board Activity:
{{taskBoardActivity}}`,
});

const highlightProjectBlockersFlow = ai.defineFlow(
  {
    name: 'highlightProjectBlockersFlow',
    inputSchema: HighlightProjectBlockersInputSchema,
    outputSchema: HighlightProjectBlockersOutputSchema,
  },
  async input => {
    const {output} = await highlightProjectBlockersPrompt(input);
    return output!;
  }
);
