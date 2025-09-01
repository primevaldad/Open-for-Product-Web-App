'use server';

/**
 * @fileOverview Summarizes the progress of a project.
 *
 * - summarizeProjectProgress - A function that summarizes project progress.
 * - SummarizeProjectProgressInput - The input type for the summarizeProjectProgress function.
 * - SummarizeProjectProgressOutput - The return type for the summarizeProjectProgress function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeProjectProgressInputSchema = z.object({
  projectName: z.string().describe('The name of the project.'),
  recentActivity: z.string().describe('A summary of recent activity on the project, including discussions and progress updates.'),
});
type SummarizeProjectProgressInput = z.infer<typeof SummarizeProjectProgressInputSchema>;

const SummarizeProjectProgressOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the project progress.'),
});
type SummarizeProjectProgressOutput = z.infer<typeof SummarizeProjectProgressOutputSchema>;

export async function summarizeProjectProgress(input: SummarizeProjectProgressInput): Promise<SummarizeProjectProgressOutput> {
  return summarizeProjectProgressFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeProjectProgressPrompt',
  input: {schema: SummarizeProjectProgressInputSchema},
  output: {schema: SummarizeProjectProgressOutputSchema},
  prompt: `You are a project management assistant.  Your job is to summarize the progress of a project based on the recent activity.

Project Name: {{projectName}}
Recent Activity: {{recentActivity}}

Summary: `,
});

const summarizeProjectProgressFlow = ai.defineFlow(
  {
    name: 'summarizeProjectProgressFlow',
    inputSchema: SummarizeProjectProgressInputSchema,
    outputSchema: SummarizeProjectProgressOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
