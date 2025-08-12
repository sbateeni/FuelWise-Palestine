import { FuelCostCalculator } from '@/components/fuel-cost-calculator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Map, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 py-8 sm:p-8">
      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center">
            <h1 className="text-4xl font-bold font-headline text-primary">FuelWise Palestine</h1>
            <p className="text-muted-foreground mt-2 text-lg">أدوات ذكية لرحلاتك في فلسطين</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FuelCostCalculator />
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>مخطط الرحلات الذكي</CardTitle>
                    <CardDescription>خطط لرحلتك، شاهد المسار على الخريطة واحصل على نصائح ذكية للسفر.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-center justify-center text-center">
                    <Map className="w-24 h-24 text-primary/50 mb-4" />
                    <p className="mb-6">انتقل إلى مخطط الرحلات لاستكشاف المسارات والحصول على إرشادات مفصلة مدعومة بالذكاء الاصطناعي.</p>
                    <Link href="/planner" passHref>
                        <Button size="lg">
                            اذهب إلى مخطط الرحلات <ArrowRight className="ml-2" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
      </div>
    </main>
  );
}
