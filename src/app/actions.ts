'use server';

import { getGeocode } from '@/ai/flows/geocode';
import { getTravelTips } from '@/ai/flows/travel-tips';
import { getGasStations } from '@/ai/flows/gas-stations';
import { estimateDistance } from '@/ai/flows/distance-estimation';
import type { RouteInfo, FuelCostFormValues } from '@/lib/types';
import { suggestPlaces } from '@/ai/flows/places-autocomplete';


export async function getPlaceSuggestions(query: string): Promise<string[]> {
    if (query.length < 2) {
        return [];
    }
    try {
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
    const { waypoint } = await estimateDistance({ start: req.start, end: req.end });

    const locations = [req.start];
    if (waypoint) {
        locations.push(waypoint);
    }
    locations.push(req.end);

    const geocodePromises = locations.map(location => getGeocode({ location }));
    const geocodes = await Promise.all(geocodePromises);

    if (geocodes.some(g => !g?.latitude || !g?.longitude)) {
        return { success: false, error: 'Could not determine the location for one of the points.' };
    }

    const coords = geocodes.map(g => `${g.longitude},${g.latitude}`).join(';');
    
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;
    const osrmResponse = await fetch(osrmUrl);
    if (!osrmResponse.ok) {
        const errorBody = await osrmResponse.text();
        return { success: false, error: `Failed to calculate route from OSRM: ${osrmResponse.status} ${errorBody}` };
    }
    const osrmData = await osrmResponse.json();

    if (osrmData.code !== 'Ok' || !osrmData.routes?.[0]) {
      return { success: false, error: `No route found between the points: ${osrmData.message || 'No available route.'}` };
    }

    const route = osrmData.routes[0];
    const leg = route.legs[0];
    const distanceKmRaw = route.distance / 1000;

    const distanceKm = distanceKmRaw.toFixed(1) + ' km';
    const durationMinutes = Math.round(route.duration / 60);
    const durationFormatted = `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;
    
    const routeGeometry = route.geometry;

    const tipsPromise = getTravelTips({
      start: req.start,
      end: req.end,
      distance: distanceKm,
      duration: durationFormatted,
    });
    const gasStationsPromise = getGasStations({ start: req.start, end: req.end });

    const steps = route.legs.flatMap((leg: any) => 
        leg.steps.map((step: any) => ({
            instruction: step.maneuver.instruction,
            distance: `${(step.distance / 1000).toFixed(1)} km`,
        }))
    );


    const [tipsResponse, gasStationsResponse] = await Promise.all([tipsPromise, gasStationsPromise]);
    
    const tips = String(tipsResponse.tips || '').replace(/\*/g, '•');
    const gasStations = gasStationsResponse.stations;

    let costResult;
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `An unexpected server error occurred: ${errorMessage}` };
  }
}
