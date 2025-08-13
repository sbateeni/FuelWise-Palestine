import { genkit, configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { isClient } from '@/lib/utils';

let apiKey: string | undefined;

if (isClient()) {
  apiKey = localStorage.getItem('gemini_api_key') || undefined;
}

export const ai = genkit({
  plugins: [googleAI(apiKey ? { apiKey } : undefined)],
  model: 'googleai/gemini-2.0-flash',
});
