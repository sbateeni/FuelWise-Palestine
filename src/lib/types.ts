import { z } from 'zod';

export const fuelCostSchema = z.object({
  start: z.string().min(2, { message: "يجب إدخال نقطة انطلاق صالحة." }),
  end: z.string().min(2, { message: "يجب إدخال نقطة وصول صالحة." }),
  vehicleType: z.string().min(2, { message: "يجب إدخال نوع المركبة." }),
  year: z.coerce.number().min(1980, { message: "يجب أن تكون سنة التصنيع بعد 1980." }).max(new Date().getFullYear() + 1, { message: `لا يمكن أن تكون سنة التصنيع في المستقبل.` }),
  vehicleClass: z.string({ required_error: "الرجاء اختيار فئة المركبة." }),
  fuelType: z.string({ required_error: "الرجاء اختيار نوع الوقود." }),
  consumption: z.coerce.number().positive({ message: "يجب أن يكون الاستهلاك رقمًا موجبًا." }),
});

export type FuelCostFormValues = z.infer<typeof fuelCostSchema>;

export interface CalculationResult {
  distanceKm: number;
  fuelNeeded: number;
  totalCost: number;
  fuelPrice: number;
}
