'use server';

/**
 * @fileOverview Calculates the distance between two geographical points using GenAI.
 *
 * - estimateDistance - A function that estimates the distance between two points.
 * - DistanceEstimationInput - The input type for the estimateDistance function.
 * - DistanceEstimationOutput - The return type for the estimateDistance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DistanceEstimationInputSchema = z.object({
  start: z.string().describe('The starting point of the journey.'),
  end: z.string().describe('The destination point of the journey.'),
});
export type DistanceEstimationInput = z.infer<typeof DistanceEstimationInputSchema>;

const DistanceEstimationOutputSchema = z.object({
  distanceKm: z.number().describe('The estimated distance in kilometers.'),
});
export type DistanceEstimationOutput = z.infer<typeof DistanceEstimationOutputSchema>;

export async function estimateDistance(input: DistanceEstimationInput): Promise<DistanceEstimationOutput> {
  return estimateDistanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'distanceEstimationPrompt',
  input: {schema: DistanceEstimationInputSchema},
  output: {schema: DistanceEstimationOutputSchema},
  prompt: `You are a travel assistant. Calculate the distance in kilometers between the start and end points.

Start: {{{start}}}
End: {{{end}}}

Return ONLY a JSON object.
`,
});

const estimateDistanceFlow = ai.defineFlow(
  {
    name: 'estimateDistanceFlow',
    inputSchema: DistanceEstimationInputSchema,
    outputSchema: DistanceEstimationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
