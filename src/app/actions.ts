'use server';

import { getGeocode } from '@/ai/flows/geocode';
import { getTravelTips } from '@/ai/flows/travel-tips';
import { getGasStations } from '@/ai/flows/gas-stations';
import { getFuelPrice } from '@/lib/db';
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


export async function getRouteAndTips(
  req: FuelCostFormValues
): Promise<{ success: true; data: RouteInfo } | { success: false; error: string }> {
  try {
    const [startGeocode, endGeocode] = await Promise.all([
      getGeocode({ location: req.start }),
      getGeocode({ location: req.end }),
    ]);

    if (!startGeocode?.latitude || !endGeocode?.latitude) {
      return { success: false, error: 'لم نتمكن من تحديد مواقع البداية أو النهاية.' };
    }

    const startCoords = `${startGeocode.longitude},${startGeocode.latitude}`;
    const endCoords = `${endGeocode.longitude},${endGeocode.latitude}`;

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords};${endCoords}?overview=full&geometries=geojson&steps=true`;
    const osrmResponse = await fetch(osrmUrl);
    if (!osrmResponse.ok) {
        const errorBody = await osrmResponse.text();
        return { success: false, error: `فشل في حساب المسار من OSRM: ${osrmResponse.status} ${errorBody}` };
    }
    const osrmData = await osrmResponse.json();

    if (osrmData.code !== 'Ok' || !osrmData.routes?.[0]) {
      return { success: false, error: `لم يتم العثور على مسار بين النقطتين: ${osrmData.message}` };
    }

    const route = osrmData.routes[0];
    const leg = route.legs[0];
    const distanceKmRaw = leg.distance / 1000;

    const distanceKm = distanceKmRaw.toFixed(1) + ' كم';
    const durationMinutes = Math.round(leg.duration / 60);
    const durationFormatted = `${Math.floor(durationMinutes / 60)} س ${durationMinutes % 60} د`;
    
    const routeGeometry = route.geometry;

    const tipsPromise = getTravelTips({
      start: req.start,
      end: req.end,
      distance: distanceKm,
      duration: durationFormatted,
    });
    const gasStationsPromise = getGasStations({ start: req.start, end: req.end });
    const fuelPricePromise = getFuelPrice(req.fuelType);

    const steps = leg.steps.map((step: any) => ({
      instruction: step.maneuver.instruction,
      distance: `${(step.distance / 1000).toFixed(1)} كم`,
    }));

    const [tipsResponse, gasStationsResponse, fuelPrice] = await Promise.all([tipsPromise, gasStationsPromise, fuelPricePromise]);
    
    const tips = tipsResponse.tips.replace(/\*/g, '•');
    const gasStations = gasStationsResponse.stations;

    let costResult;
    if (fuelPrice) {
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
    return { success: false, error: errorMessage };
  }
}
