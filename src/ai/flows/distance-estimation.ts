'use server';

/**
 * @fileOverview Calculates the distance between two geographical points using GenAI,
 * ensuring the route remains within the West Bank by finding a waypoint.
 *
 * - estimateDistance - A function that estimates the distance between two points.
 * - DistanceEstimationInput - The input type for the estimateDistance function.
 * - DistanceEstimationOutput - The return type for the estimateDistance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DistanceEstimationInputSchema = z.object({
  start: z.string().describe('The starting point of the journey in Palestine.'),
  end: z.string().describe('The destination point of the journey in Palestine.'),
});
export type DistanceEstimationInput = z.infer<typeof DistanceEstimationInputSchema>;

const DistanceEstimationOutputSchema = z.object({
  distanceKm: z.number().describe('The estimated distance in kilometers.'),
  waypoint: z.string().optional().describe('A major city or waypoint within the West Bank to route through.'),
});
export type DistanceEstimationOutput = z.infer<typeof DistanceEstimationOutputSchema>;

export async function estimateDistance(input: DistanceEstimationInput): Promise<DistanceEstimationOutput> {
  return estimateDistanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'distanceEstimationPrompt',
  input: {schema: DistanceEstimationInputSchema},
  output: {schema: DistanceEstimationOutputSchema},
  prompt: `You are a travel assistant for Palestine. Calculate the distance in kilometers between the start and end points.

To ensure the route stays within the West Bank and avoids Israeli territory, identify a major Palestinian city that lies on the most logical route between the start and end points to serve as a waypoint. For example, for a trip from Jenin to Hebron, a good waypoint would be Ramallah. If the start or end point is a major city itself (like Ramallah, Nablus, Hebron, Jenin), you may not need a separate waypoint.

Start: {{{start}}}
End: {{{end}}}

Return ONLY a JSON object with "distanceKm" and an optional "waypoint".
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
