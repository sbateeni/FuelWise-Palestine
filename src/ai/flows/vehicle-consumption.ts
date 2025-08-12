'use server';
/**
 * @fileOverview A flow to get vehicle fuel consumption data.
 * It first checks a local JSON DB, and if not found, uses GenAI to estimate it,
 * and then saves it for future use.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fs from 'fs/promises';
import path from 'path';

// Define the path to the JSON database file
const dbPath = path.resolve(process.cwd(), 'src/lib/consumption_db.json');

// Define input and output schemas
const VehicleConsumptionInputSchema = z.object({
  manufacturer: z.string().describe('The manufacturer of the vehicle (e.g., Toyota, Ford).'),
  model: z.string().describe('The model of the vehicle (e.g., Camry, Focus).'),
  year: z.number().describe('The manufacturing year of the vehicle.'),
});
export type VehicleConsumptionInput = z.infer<typeof VehicleConsumptionInputSchema>;

const VehicleConsumptionOutputSchema = z.object({
  consumption: z.number().describe('The estimated fuel consumption in liters per 100 km.'),
  source: z.enum(['cache', 'ai']).describe('The source of the data.'),
});
export type VehicleConsumptionOutput = z.infer<typeof VehicleConsumptionOutputSchema>;

// Helper function to read the database
async function readDb(): Promise<Record<string, number>> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, return an empty object
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

// Helper function to write to the database
async function writeDb(data: Record<string, number>): Promise<void> {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

// The main exported function that the API route will call
export async function getVehicleConsumption(input: VehicleConsumptionInput): Promise<VehicleConsumptionOutput> {
  return vehicleConsumptionFlow(input);
}

// Exported for internal use if needed, e.g., for batch updates later
export async function saveVehicleConsumption(input: VehicleConsumptionInput & { consumption: number }): Promise<void> {
    const db = await readDb();
    const key = `${input.manufacturer}-${input.model}-${input.year}`.toLowerCase();
    db[key] = input.consumption;
    await writeDb(db);
}


// Genkit Prompt for estimating consumption
const consumptionPrompt = ai.definePrompt({
    name: 'vehicleConsumptionPrompt',
    input: { schema: VehicleConsumptionInputSchema },
    output: { schema: z.object({ consumption: z.number() }) },
    prompt: `
        You are a vehicle expert. Based on the manufacturer, model, and year, provide an accurate estimate for the fuel consumption in liters per 100 kilometers (L/100km).

        Vehicle Manufacturer: {{{manufacturer}}}
        Vehicle Model: {{{model}}}
        Vehicle Year: {{{year}}}

        Return ONLY a JSON object with the key "consumption". Do not provide any other text or explanation.
        Example: {"consumption": 8.5}
    `,
});


// The Genkit Flow
const vehicleConsumptionFlow = ai.defineFlow(
  {
    name: 'vehicleConsumptionFlow',
    inputSchema: VehicleConsumptionInputSchema,
    outputSchema: VehicleConsumptionOutputSchema,
  },
  async (input) => {
    const db = await readDb();
    const key = `${input.manufacturer}-${input.model}-${input.year}`.toLowerCase();

    // 1. Check the cache (our JSON file) first
    if (db[key]) {
      return {
        consumption: db[key],
        source: 'cache',
      };
    }

    // 2. If not in cache, call the AI model
    const { output } = await consumptionPrompt(input);
    const consumption = output!.consumption;


    // 3. Save the new AI-generated value to the database
    db[key] = consumption;
    await writeDb(db);

    return {
        consumption,
        source: 'ai',
    };
  }
);
