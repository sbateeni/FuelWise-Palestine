import { FuelCostCalculator } from '@/components/fuel-cost-calculator';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 py-8 sm:p-8">
      <div className="w-full max-w-6xl">
        <FuelCostCalculator />
      </div>
    </main>
  );
}
