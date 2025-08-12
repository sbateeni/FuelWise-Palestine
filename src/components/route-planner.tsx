"use client";

import * as React from "react";
import dynamic from 'next/dynamic';
import {
  Loader2,
  Navigation,
  Clock,
  Waypoints,
  Sparkles,
  Fuel,
  MapPin,
} from "lucide-react";
import { Suspense } from 'react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRouteAndTips } from "@/app/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RouteInfo } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const Map = dynamic(() => import('@/components/map'), { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted flex items-center justify-center"><p>جاري تحميل الخريطة...</p></div>
});


export default function RoutePlanner() {
  const [start, setStart] = React.useState("رام الله");
  const [end, setEnd] = React.useState("نابلس");
  const [routeInfo, setRouteInfo] = React.useState<RouteInfo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const getDirections = React.useCallback(async (startPoint: string, endPoint: string) => {
    if (!startPoint || !endPoint) {
      setError("الرجاء إدخال نقطة البداية والوصول.");
      return;
    }
    setLoading(true);
    setRouteInfo(null);
    setError(null);

    const result = await getRouteAndTips({ start: startPoint, end: endPoint });
    if (result.success) {
      setRouteInfo(result.data);
    } else {
      setError(result.error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: result.error,
      });
    }
    setLoading(false);
  }, [toast]);

  const handleGetDirectionsClick = () => {
    getDirections(start, end);
  }

  // Fetch initial route on component mount
  React.useEffect(() => {
    getDirections("رام الله", "نابلس");
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto p-2 sm:p-4" dir="rtl">
      <Card className="mb-4">
        <CardHeader>
          <h1 className="text-3xl font-bold text-center text-primary">
            مخطط الرحلات الذكي في فلسطين
          </h1>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Input and Details Column */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>ادخل تفاصيل رحلتك</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="start-point" className="block mb-2 font-medium">
                    نقطة البداية
                  </Label>
                  <Input
                    id="start-point"
                    type="text"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    placeholder="مثال: القدس"
                    className="w-full p-2"
                  />
                </div>

                <div>
                  <Label htmlFor="end-point" className="block mb-2 font-medium">
                    نقطة الوصول
                  </Label>
                  <Input
                    id="end-point"
                    type="text"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    placeholder="مثال: غزة"
                    className="w-full p-2"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
              <Button
                onClick={handleGetDirectionsClick}
                disabled={loading}
                className="w-full mt-4"
              >
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                {loading ? "جاري البحث..." : "عرض الاتجاهات والنصائح"}
              </Button>
            </CardContent>
          </Card>

          {(loading || routeInfo) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Waypoints className="ml-2" />
                  تفاصيل الرحلة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading && !routeInfo ? (
                  <div className="space-y-4">
                    <div className="h-6 bg-muted rounded w-1/2"></div>
                    <div className="h-6 bg-muted rounded w-1/3"></div>
                    <div className="h-20 bg-muted rounded w-full mt-4"></div>
                  </div>
                ) : routeInfo ? (
                  <div className="space-y-4">
                    <div className="flex justify-around text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Navigation className="h-7 w-7 text-primary" />
                        <span className="font-bold text-lg">
                          {routeInfo.distance}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          المسافة
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Clock className="h-7 w-7 text-primary" />
                        <span className="font-bold text-lg">
                          {routeInfo.duration}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          المدة
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold pt-4 text-lg border-t mt-4">
                      خطوات الرحلة:
                    </h3>
                    <ScrollArea className="h-40 pr-4">
                      <ol className="list-decimal list-inside space-y-3 text-sm">
                        {routeInfo.steps.map((step, index) => (
                          <li key={index}>
                            {step.instruction}{" "}
                            <strong className="text-muted-foreground">
                              ({step.distance})
                            </strong>
                          </li>
                        ))}
                      </ol>
                    </ScrollArea>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

        </div>

        {/* Map and Tips Column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
            <Card className="flex-grow min-h-[400px]">
                <CardContent className="p-0 h-full w-full">
                  <Suspense fallback={<div className="h-full w-full bg-muted flex items-center justify-center"><p>جاري تحميل الخريطة...</p></div>}>
                    <Map routeGeometry={routeInfo?.routeGeometry} />
                  </Suspense>
                </CardContent>
            </Card>
             {(loading || routeInfo) && (
                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                            <Sparkles className="ml-2" />
                            نصائح ذكية للسفر
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading && !routeInfo ? (
                            <div className="space-y-2">
                                <div className="h-4 bg-muted rounded w-full"></div>
                                <div className="h-4 bg-muted rounded w-5/6"></div>
                                <div className="h-4 bg-muted rounded w-full"></div>
                                <div className="h-4 bg-muted rounded w-4/6"></div>
                            </div>
                            ) : routeInfo ? (
                            <ScrollArea className="h-40 pr-4">
                                <div
                                className="whitespace-pre-wrap font-body text-sm leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: routeInfo.tips }}
                                />
                            </ScrollArea>
                            ) : null}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Fuel className="ml-2" />
                                محطات وقود على الطريق
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             {loading && !routeInfo ? (
                                 <div className="space-y-4">
                                    <div className="h-8 bg-muted rounded w-full"></div>
                                    <div className="h-8 bg-muted rounded w-full"></div>
                                    <div className="h-8 bg-muted rounded w-full"></div>
                                 </div>
                             ) : routeInfo && routeInfo.gasStations.length > 0 ? (
                                <ScrollArea className="h-40 pr-4">
                                    <ul className="space-y-3">
                                        {routeInfo.gasStations.map((station, index) => (
                                            <li key={index} className="flex items-center p-2 bg-secondary/30 rounded-md">
                                                <Fuel className="w-5 h-5 ml-3 text-primary" />
                                                <div>
                                                    <p className="font-semibold">{station.name}</p>
                                                    <p className="text-sm text-muted-foreground flex items-center">
                                                        <MapPin className="w-3 h-3 ml-1" />
                                                        {station.location}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </ScrollArea>
                             ) : (
                                <p className="text-muted-foreground">لا توجد محطات وقود مقترحة لهذا المسار.</p>
                             )}
                        </CardContent>
                    </Card>
                </div>
             )}
        </div>
      </div>
    </div>
  );
}