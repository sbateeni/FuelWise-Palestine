'use server';

/**
 * @fileOverview Generates travel tips for a journey in Palestine using GenAI.
 *
 * - getTravelTips - A function that returns travel tips.
 * - TravelTipsInput - The input type for the getTravelTips function.
 * - TravelTipsOutput - The return type for the getTravelTips function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TravelTipsInputSchema = z.object({
  start: z.string().describe('The starting point of the journey.'),
  end: z.string().describe('The destination of the journey.'),
  distance: z.string().describe('The total distance of the journey.'),
  duration: z.string().describe('The estimated duration of the journey.'),
});
export type TravelTipsInput = z.infer<typeof TravelTipsInputSchema>;

const TravelTipsOutputSchema = z.object({
  tips: z.string().describe('A markdown-formatted string of travel tips.'),
});
export type TravelTipsOutput = z.infer<typeof TravelTipsOutputSchema>;

export async function getTravelTips(input: TravelTipsInput): Promise<TravelTipsOutput> {
  return travelTipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'travelTipsPrompt',
  input: { schema: TravelTipsInputSchema },
  output: { schema: TravelTipsOutputSchema },
  prompt: `
        You are a helpful travel assistant for Palestine.
        Give me travel tips for a car journey from {{{start}}} to {{{end}}}.
        The journey is {{{distance}}} and will take approximately {{{duration}}}.
        
        Consider the following points in your advice:
        - Road conditions
        - Potential checkpoints
        - Recommended fuel stops if it's a long journey
        - The best time to travel to avoid traffic
        - Any general safety or travel advice for this specific route.
        
        Provide the answer in Arabic, using clear, concise points. Format the output as a single string. Use markdown for formatting like bolding and lists. Use \\n for newlines.
      `,
});

const travelTipsFlow = ai.defineFlow(
  {
    name: 'travelTipsFlow',
    inputSchema: TravelTipsInputSchema,
    outputSchema: TravelTipsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
