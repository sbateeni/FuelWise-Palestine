'use server';

/**
 * @fileOverview Provides place autocomplete suggestions using GenAI.
 *
 * - suggestPlaces - A function that suggests places based on a query.
 * - PlacesAutocompleteInput - The input type for the suggestPlaces function.
 * - PlacesAutocompleteOutput - The return type for the suggestPlaces function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PlacesAutocompleteInputSchema = z.object({
  query: z.string().describe('The partial text to search for places.'),
});
export type PlacesAutocompleteInput = z.infer<typeof PlacesAutocompleteInputSchema>;

const PlacesAutocompleteOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of up to 5 place suggestions.'),
});
export type PlacesAutocompleteOutput = z.infer<typeof PlacesAutocompleteOutputSchema>;

export async function suggestPlaces(input: PlacesAutocompleteInput): Promise<PlacesAutocompleteOutput> {
  return placesAutocompleteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'placesAutocompletePrompt',
  input: {schema: PlacesAutocompleteInputSchema},
  output: {schema: PlacesAutocompleteOutputSchema},
  prompt: `You are a helpful assistant. Based on the user's query, provide up to 5 autocomplete suggestions for places in Palestine.

Query: {{{query}}}

Return ONLY a JSON object with a "suggestions" array.`,
});

const placesAutocompleteFlow = ai.defineFlow(
  {
    name: 'placesAutocompleteFlow',
    inputSchema: PlacesAutocompleteInputSchema,
    outputSchema: PlacesAutocompleteOutputSchema,
  },
  async input => {
    if (input.query.length < 2) {
        return { suggestions: [] };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
