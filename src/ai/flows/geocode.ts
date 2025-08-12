'use server';

/**
 * @fileOverview Geocodes a location string into latitude and longitude coordinates using GenAI.
 *
 * - getGeocode - A function that returns the coordinates for a given location.
 * - GeocodeInput - The input type for the getGeocode function.
 * - GeocodeOutput - The return type for the getGeocode function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeocodeInputSchema = z.object({
  location: z.string().describe('The location to geocode (e.g., "Ramallah", "Jerusalem").'),
});
export type GeocodeInput = z.infer<typeof GeocodeInputSchema>;

const GeocodeOutputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type GeocodeOutput = z.infer<typeof GeocodeOutputSchema>;

export async function getGeocode(input: GeocodeInput): Promise<GeocodeOutput> {
  return geocodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'geocodePrompt',
  input: { schema: GeocodeInputSchema },
  output: { schema: GeocodeOutputSchema },
  prompt: `You are a geocoding assistant. Find the latitude and longitude for the given location in Palestine.

Location: {{{location}}}

Return ONLY a JSON object with "latitude" and "longitude".
`,
});

const geocodeFlow = ai.defineFlow(
  {
    name: 'geocodeFlow',
    inputSchema: GeocodeInputSchema,
    outputSchema: GeocodeOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
