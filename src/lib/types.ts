import { z } from 'zod';
import type { GeoJsonObject } from 'geojson';

export const fuelCostSchema = z.object({
  start: z.string().min(2, { message: "Must enter a valid starting point." }),
  end: z.string().min(2, { message: "Must enter a valid destination." }),
  manufacturer: z.string().min(2, { message: "Manufacturer is required." }),
  model: z.string().min(2, { message: "Model is required." }),
  year: z.coerce.number().min(1980, { message: "Year must be after 1980." }).max(new Date().getFullYear() + 1, { message: `Year cannot be in the future.` }),
  vehicleClass: z.string({ required_error: "Please select a vehicle class." }),
  fuelType: z.string({ required_error: "Please select a fuel type." }),
  consumption: z.coerce.number().positive({ message: "Consumption must be a positive number." }),
});

export type FuelCostFormValues = z.infer<typeof fuelCostSchema>;

export interface CalculationResult {
  distanceKm: number;
  fuelNeeded: number;
  totalCost: number;
  fuelPrice: number;
}

export interface RouteRequest {
    start: string;
    end: string;
}

export interface GasStation {
    name: string;
    location: string;
}

export interface RouteInfo {
    distance: string;
    duration: string;
    steps: Array<{
        instruction: string;
        distance: string;
    }>;
    tips: string;
    routeGeometry: GeoJsonObject;
    gasStations: GasStation[];
    cost?: {
        fuelNeeded: string;
        totalCost: string;
    }
}

export interface VehicleProfile {
  manufacturer: string;
  model: string;
  year: number;
  vehicleClass: string;
  consumption: number;
  fuelType: string;
}
