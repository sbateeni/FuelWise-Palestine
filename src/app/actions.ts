'use server';

import { getGeocode } from '@/ai/flows/geocode';
import { getTravelTips } from '@/ai/flows/travel-tips';
import { getGasStations } from '@/ai/flows/gas-stations';
import type { RouteInfo, FuelCostFormValues } from '@/lib/types';


export async function getPlaceSuggestions(query: string): Promise<string[]> {
    if (query.length < 2) {
        return [];
    }
    try {
        const { suggestPlaces } = await import('@/ai/flows/places-autocomplete');
        const response = await suggestPlaces({ query });
        return response.suggestions;
    } catch (error) {
        console.error('Error getting place suggestions:', error);
        return [];
    }
}

// The fuelPrice is now passed as an argument instead of being fetched here
export async function getRouteAndTips(
  req: FuelCostFormValues,
  fuelPrice: number | null
): Promise<{ success: true; data: RouteInfo } | { success: false; error: string }> {
  try {
    const [startGeocode, endGeocode] = await Promise.all([
      getGeocode({ location: req.start }),
      getGeocode({ location: req.end }),
    ]);

    if (!startGeocode?.latitude || !endGeocode?.latitude) {
      return { success: false, error: 'Could not determine start or end locations.' };
    }

    const startCoords = `${startGeocode.longitude},${startGeocode.latitude}`;
    const endCoords = `${endGeocode.longitude},${endGeocode.latitude}`;

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords};${endCoords}?overview=full&geometries=geojson&steps=true`;
    const osrmResponse = await fetch(osrmUrl);
    if (!osrmResponse.ok) {
        const errorBody = await osrmResponse.text();
        // Return the actual error from OSRM for better debugging
        return { success: false, error: `Failed to calculate route from OSRM: ${osrmResponse.status} ${errorBody}` };
    }
    const osrmData = await osrmResponse.json();

    if (osrmData.code !== 'Ok' || !osrmData.routes?.[0]) {
      // Return the actual message from OSRM
      return { success: false, error: `No route found between the points: ${osrmData.message || 'No available route.'}` };
    }

    const route = osrmData.routes[0];
    const leg = route.legs[0];
    const distanceKmRaw = leg.distance / 1000;

    const distanceKm = distanceKmRaw.toFixed(1) + ' km';
    const durationMinutes = Math.round(leg.duration / 60);
    const durationFormatted = `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;
    
    const routeGeometry = route.geometry;

    const tipsPromise = getTravelTips({
      start: req.start,
      end: req.end,
      distance: distanceKm,
      duration: durationFormatted,
    });
    const gasStationsPromise = getGasStations({ start: req.start, end: req.end });

    const steps = leg.steps.map((step: any) => ({
      instruction: step.maneuver.instruction,
      distance: `${(step.distance / 1000).toFixed(1)} km`,
    }));

    const [tipsResponse, gasStationsResponse] = await Promise.all([tipsPromise, gasStationsPromise]);
    
    // Use String() to ensure we have a string and then replace
    const tips = String(tipsResponse.tips || '').replace(/\*/g, '•');
    const gasStations = gasStationsResponse.stations;

    let costResult;
    // Check if fuelPrice is a valid number
    if (fuelPrice !== null && !isNaN(fuelPrice)) {
        const fuelNeeded = (distanceKmRaw / 100) * req.consumption;
        const totalCost = fuelNeeded * fuelPrice;
        costResult = {
            fuelNeeded: fuelNeeded.toFixed(2),
            totalCost: totalCost.toFixed(2),
        }
    }

    const routeInfo: RouteInfo = {
      distance: distanceKm,
      duration: durationFormatted,
      steps,
      tips,
      routeGeometry,
      gasStations,
      cost: costResult
    };

    return { success: true, data: routeInfo };
  } catch (error) {
    console.error('Error in getRouteAndTips:', error);
    // Return the actual error message for better client-side debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `An unexpected server error occurred: ${errorMessage}` };
  }
}
