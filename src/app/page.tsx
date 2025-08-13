import { RoutePlanner } from '@/components/route-planner';
import GoogleTranslate from '@/components/google-translate';
import { Car } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start bg-gradient-to-b from-background to-slate-900 p-4 py-8 sm:p-8">
      <div className="w-full max-w-7xl">
        <div className="mb-4 flex justify-end">
            <GoogleTranslate />
        </div>
        <div className="text-center mb-12">
            <div className="inline-block p-4 bg-primary/10 border border-primary/20 rounded-full mb-4">
              <Car className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-5xl font-bold font-headline text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-500">FuelWise Palestine</h1>
            <p className="text-muted-foreground mt-4 text-lg max-w-2xl mx-auto">Your smart companion for planning trips in Palestine. Calculate costs, get tips, and drive smarter.</p>
        </div>
        <RoutePlanner />
      </div>
    </main>
  );
}
