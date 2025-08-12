'use server';

import { estimateDistance } from '@/ai/flows/distance-estimation';
import { suggestPlaces } from '@/ai/flows/places-autocomplete';
import type { FuelCostFormValues, CalculationResult, RouteInfo, RouteRequest } from '@/lib/types';
import { getGeocode } from '@/ai/flows/geocode';
import { getTravelTips } from '@/ai/flows/travel-tips';
import { getGasStations } from '@/ai/flows/gas-stations';


export async function calculateFuelCost(
  data: FuelCostFormValues,
  fuelPrice: number | undefined
): Promise<{ success: true; result: CalculationResult } | { success: false; error: string }> {
  try {
    const { start, end, consumption, fuelType } = data;

    // 1. Estimate distance using GenAI flow
    const distanceResponse = await estimateDistance({ start, end });
    const distanceKm = distanceResponse.distanceKm;

    if (typeof distanceKm !== 'number' || distanceKm <= 0) {
      return { success: false, error: 'لم نتمكن من حساب المسافة. الرجاء التأكد من المواقع المدخلة.' };
    }

    // 2. Get fuel price (passed from client)
    if (typeof fuelPrice !== 'number') {
      return { success: false, error: 'نوع الوقود المحدد غير صالح أو لا يوجد له سعر.' };
    }

    // 3. Calculate fuel needed and total cost
    const fuelNeeded = (distanceKm / 100) * consumption;
    const totalCost = fuelNeeded * fuelNeeded;

    const result: CalculationResult = {
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      fuelNeeded: parseFloat(fuelNeeded.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      fuelPrice,
    };

    return { success: true, result };
  } catch (error) {
    console.error('Error in calculateFuelCost:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

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


export async function getRouteAndTips(
  req: RouteRequest
): Promise<{ success: true; data: RouteInfo } | { success: false; error: string }> {
  try {
    // 1. Geocode start and end points in parallel
    const [startGeocode, endGeocode] = await Promise.all([
      getGeocode({ location: req.start }),
      getGeocode({ location: req.end }),
    ]);

    if (!startGeocode?.latitude || !endGeocode?.latitude) {
      return { success: false, error: 'لم نتمكن من تحديد مواقع البداية أو النهاية.' };
    }

    const startCoords = `${startGeocode.longitude},${startGeocode.latitude}`;
    const endCoords = `${endGeocode.longitude},${endGeocode.latitude}`;

    // 2. Fetch route from OSRM, requesting GeoJSON geometry
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords};${endCoords}?overview=full&steps=true&geometries=geojson`;
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

    // 3. Format distance and duration
    const distanceKm = (leg.distance / 1000).toFixed(1) + ' كم';
    const durationMinutes = Math.round(leg.duration / 60);
    const durationFormatted = `${Math.floor(durationMinutes / 60)} س ${durationMinutes % 60} د`;
    
    // 4. Get GeoJSON geometry for the map
    const routeGeometry = route.geometry;

    // 5. Get travel tips and gas stations from Gemini in parallel
    const tipsPromise = getTravelTips({
      start: req.start,
      end: req.end,
      distance: distanceKm,
      duration: durationFormatted,
    });
    const gasStationsPromise = getGasStations({ start: req.start, end: req.end });


    // 6. Format steps
    const steps = leg.steps.map((step: any) => ({
      instruction: step.maneuver.instruction,
      distance: `${(step.distance / 1000).toFixed(1)} كم`,
    }));

    // 7. Await tips and assemble response
    const [tipsResponse, gasStationsResponse] = await Promise.all([tipsPromise, gasStationsPromise]);
    const tips = tipsResponse.tips.replace(/\*/g, '•'); // Replace asterisks with bullets for better display
    const gasStations = gasStationsResponse.stations;

    const routeInfo: RouteInfo = {
      distance: distanceKm,
      duration: durationFormatted,
      steps,
      tips,
      routeGeometry,
      gasStations,
    };

    return { success: true, data: routeInfo };
  } catch (error) {
    console.error('Error in getRouteAndTips:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}