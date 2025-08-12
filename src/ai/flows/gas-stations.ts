'use server';

/**
 * @fileOverview Finds gas stations along a route in Palestine using GenAI.
 *
 * - getGasStations - A function that returns a list of gas stations.
 * - GasStationsInput - The input type for the getGasStations function.
 * - GasStationsOutput - The return type for the getGasStations function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GasStationsInputSchema = z.object({
  start: z.string().describe('The starting point of the journey.'),
  end: z.string().describe('The destination of the journey.'),
});
export type GasStationsInput = z.infer<typeof GasStationsInputSchema>;

const GasStationsOutputSchema = z.object({
  stations: z.array(z.object({
    name: z.string().describe('The name of the gas station.'),
    location: z.string().describe('The city or area where the gas station is located.'),
  })).describe('A list of up to 5 gas stations along the route.'),
});
export type GasStationsOutput = z.infer<typeof GasStationsOutputSchema>;

export async function getGasStations(input: GasStationsInput): Promise<GasStationsOutput> {
  return gasStationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gasStationsPrompt',
  input: { schema: GasStationsInputSchema },
  output: { schema: GasStationsOutputSchema },
  prompt: `
        You are a helpful travel assistant for Palestine.
        List up to 5 major gas stations on the main roads for a car journey from {{{start}}} to {{{end}}}.
        
        Provide the answer in English.
        Return ONLY a JSON object.
      `,
});

const gasStationsFlow = ai.defineFlow(
  {
    name: 'gasStationsFlow',
    inputSchema: GasStationsInputSchema,
    outputSchema: GasStationsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
