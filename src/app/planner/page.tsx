import RoutePlanner from "@/components/route-planner";

export default function PlannerPage() {
    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-start bg-background p-4 py-8 sm:p-8">
            <RoutePlanner />
        </main>
    );
}
