'use server';
import { getVehicleConsumption, saveVehicleConsumption } from '@/ai/flows/vehicle-consumption';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const manufacturer = searchParams.get('manufacturer');
  const model = searchParams.get('model');
  const year = searchParams.get('year');

  if (!manufacturer || !model || !year) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const result = await getVehicleConsumption({
      manufacturer,
      model,
      year: parseInt(year, 10),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in consumption API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
