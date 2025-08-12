'use server';

import { estimateDistance } from '@/ai/flows/distance-estimation';
import { suggestPlaces } from '@/ai/flows/places-autocomplete';
import type { FuelCostFormValues, CalculationResult } from '@/lib/types';

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
    const totalCost = fuelNeeded * fuelPrice;

    const result: CalculationResult = {
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      fuelNeeded: parseFloat(fuelNeeded.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      fuelPrice,
    };

    return { success: true, result };
  } catch (error) {
    console.error('Error in calculateFuelCost:', error);
    return { success: false, error: 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.' };
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
