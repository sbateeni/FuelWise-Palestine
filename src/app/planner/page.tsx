import { RoutePlanner } from "@/components/route-planner";

export default function PlannerPage() {
    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-start bg-background p-4 py-8 sm:p-8">
            <div className="w-full max-w-7xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold font-headline text-primary">FuelWise Palestine</h1>
                    <p className="text-muted-foreground mt-2 text-lg">خطط لرحلاتك في فلسطين بذكاء وكفاءة</p>
                </div>
                <RoutePlanner />
            </div>
        </main>
    );
}
