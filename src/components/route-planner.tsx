"use client";

import * as React from "react";
import {
  Loader2,
  Navigation,
  Clock,
  Waypoints,
  Sparkles,
  Fuel,
  MapPin,
  Car,
  CalendarDays,
  Layers3,
  Gauge,
  Droplets,
  CircleDollarSign,
  Save,
  Building,
  CarTaxiFront,
  Wand2,
} from "lucide-react";
import { Suspense } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getRouteAndTips } from "@/app/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RouteInfo, FuelCostFormValues, VehicleProfile } from "@/lib/types";
import { fuelCostSchema } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getAllFuelPrices, getVehicleProfile, saveVehicleProfile } from "@/lib/db";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import Map from './map';

const vehicleClasses = ["سيارة ركاب", "شاحنة صغيرة", "حافلة", "دراجة نارية"];

export function RoutePlanner() {
  const [routeInfo, setRouteInfo] = React.useState<RouteInfo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingConsumption, setLoadingConsumption] = React.useState(false);
  const { toast } = useToast();
  const [fuelTypes, setFuelTypes] = React.useState<string[]>([]);
  
  const form = useForm<FuelCostFormValues>({
    resolver: zodResolver(fuelCostSchema),
    defaultValues: {
      start: "رام الله",
      end: "نابلس",
      manufacturer: "",
      model: "",
      year: new Date().getFullYear(),
      vehicleClass: "سيارة ركاب",
      fuelType: "بنزين 95",
      consumption: 8,
    },
  });

  React.useEffect(() => {
    async function loadInitialData() {
      try {
        const [prices, profile] = await Promise.all([
          getAllFuelPrices(),
          getVehicleProfile()
        ]);
        
        setFuelTypes(Object.keys(prices));

        if (profile) {
          form.reset({
            ...form.getValues(),
            manufacturer: profile.manufacturer,
            model: profile.model,
            year: profile.year,
            vehicleClass: profile.vehicleClass,
            consumption: profile.consumption,
            fuelType: profile.fuelType || 'بنزين 95',
          });
        }
      } catch (error) {
        console.error("Failed to load initial data from DB", error);
        toast({
          variant: "destructive",
          title: "خطأ في التحميل",
          description: "لم نتمكن من تحميل البيانات المحفوظة.",
        });
      }
    }
    loadInitialData();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);
  

  const getDirections = React.useCallback(async (data: FuelCostFormValues) => {
    setLoading(true);
    setRouteInfo(null);

    const result = await getRouteAndTips(data);
    if (result.success) {
      setRouteInfo(result.data);
      // Save vehicle profile on successful calculation
      const vehicleProfile: VehicleProfile = {
        manufacturer: data.manufacturer,
        model: data.model,
        year: data.year,
        vehicleClass: data.vehicleClass,
        consumption: data.consumption,
        fuelType: data.fuelType,
      };
      await saveVehicleProfile(vehicleProfile);
      toast({
        title: "تم حفظ المركبة",
        description: "تم حفظ بيانات مركبتك للاستخدام المستقبلي.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: result.error,
      });
    }
    setLoading(false);
  }, [toast]);

  const fetchConsumption = async () => {
    const { manufacturer, model, year } = form.getValues();
    if (!manufacturer || !model || !year) {
      toast({
        variant: "destructive",
        title: "معلومات ناقصة",
        description: "الرجاء إدخال الشركة المصنّعة والطراز وسنة التصنيع للمركبة.",
      });
      return;
    }
    setLoadingConsumption(true);
    try {
        const response = await fetch(`/api/consumption?manufacturer=${manufacturer}&model=${model}&year=${year}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'فشل في جلب البيانات');
        }

        form.setValue('consumption', data.consumption, { shouldValidate: true });
        toast({
            title: `تم جلب الاستهلاك بنجاح (${data.source === 'ai' ? 'AI' : 'محفوظ'})`,
            description: `تم تحديد معدل الاستهلاك المقدر بـ ${data.consumption} لتر/100كم.`,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
        toast({
            variant: "destructive",
            title: "خطأ",
            description: errorMessage,
        });
    } finally {
        setLoadingConsumption(false);
    }
};

  
  // Fetch initial route on component mount
  React.useEffect(() => {
    // Only fetch if vehicle data is available to make a calculation
    if (form.getValues().manufacturer) {
        getDirections(form.getValues());
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full mx-auto" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Input and Details Column */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>ادخل تفاصيل رحلتك ومركبتك</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(getDirections)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <MapPin className="inline-block ml-1 h-4 w-4" />
                            نقطة الانطلاق
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="مثال: رام الله" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="end"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <MapPin className="inline-block ml-1 h-4 w-4" />
                            نقطة الوصول
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="مثال: نابلس" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Separator className="my-4" />
                   <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="manufacturer" render={({ field }) => (
                      <FormItem>
                        <FormLabel><Building className="inline-block ml-1 h-4 w-4" /> الشركة المصنّعة</FormLabel>
                        <FormControl><Input placeholder="مثال: VW" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={form.control} name="model" render={({ field }) => (
                      <FormItem>
                        <FormLabel><CarTaxiFront className="inline-block ml-1 h-4 w-4" /> طراز المركبة</FormLabel>
                        <FormControl><Input placeholder="مثال: Golf" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="year" render={({ field }) => (
                      <FormItem>
                        <FormLabel><CalendarDays className="inline-block ml-1 h-4 w-4" /> سنة التصنيع</FormLabel>
                        <FormControl><Input type="number" placeholder="مثال: 2022" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="vehicleClass" render={({ field }) => (
                      <FormItem>
                        <FormLabel><Layers3 className="inline-block ml-1 h-4 w-4" /> فئة المركبة</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر فئة المركبة" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {vehicleClasses.map((vc) => (<SelectItem key={vc} value={vc}>{vc}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                    <FormField control={form.control} name="fuelType" render={({ field }) => (
                      <FormItem>
                        <FormLabel><Fuel className="inline-block ml-1 h-4 w-4" /> نوع الوقود</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر نوع الوقود" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {fuelTypes.map((ft) => (<SelectItem key={ft} value={ft}>{ft}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={form.control} name="consumption" render={({ field }) => (
                      <FormItem>
                          <FormLabel><Gauge className="inline-block ml-1 h-4 w-4" /> معدل الاستهلاك (لتر/100كم)</FormLabel>
                          <div className="flex items-center gap-2">
                              <FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                              <Button type="button" variant="outline" size="icon" onClick={fetchConsumption} disabled={loadingConsumption} aria-label="جلب الاستهلاك تلقائيًا">
                                  {loadingConsumption ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                              </Button>
                          </div>
                          <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full mt-4">
                    {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    {loading ? "جاري الحساب..." : "احسب المسار والتكلفة"}
                    <Save className="mr-2 h-4 w-4" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Map and Results Column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card className="flex-grow min-h-[400px]">
              <CardContent className="p-0 h-full w-full">
                <Suspense fallback={<div className="h-full w-full bg-muted flex items-center justify-center"><p>جاري تحميل الخريطة...</p></div>}>
                  <Map routeGeometry={routeInfo?.routeGeometry} />
                </Suspense>
              </CardContent>
          </Card>
           {(loading || routeInfo) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                      <CardHeader><CardTitle className="flex items-center"><Waypoints className="ml-2" /> تفاصيل الرحلة</CardTitle></CardHeader>
                      <CardContent>
                          {loading && !routeInfo ? (
                              <div className="space-y-4"><div className="h-20 bg-muted rounded w-full animate-pulse"></div></div>
                          ) : routeInfo ? (
                              <div className="space-y-4">
                                  <div className="flex justify-around text-center">
                                      <div className="flex flex-col items-center gap-1">
                                          <Navigation className="h-7 w-7 text-primary" />
                                          <span className="font-bold text-lg">{routeInfo.distance}</span>
                                          <span className="text-xs text-muted-foreground">المسافة</span>
                                      </div>
                                      <div className="flex flex-col items-center gap-1">
                                          <Clock className="h-7 w-7 text-primary" />
                                          <span className="font-bold text-lg">{routeInfo.duration}</span>
                                          <span className="text-xs text-muted-foreground">المدة</span>
                                      </div>
                                  </div>
                              </div>
                          ) : null}
                      </CardContent>
                  </Card>
                   <Card>
                      <CardHeader><CardTitle className="flex items-center"><CircleDollarSign className="ml-2" /> تكلفة الوقود</CardTitle></CardHeader>
                      <CardContent>
                          {loading && !routeInfo ? (
                              <div className="space-y-4"><div className="h-20 bg-muted rounded w-full animate-pulse"></div></div>
                          ) : routeInfo && routeInfo.cost ? (
                              <div className="flex justify-around text-center">
                                  <div className="flex flex-col items-center gap-1">
                                      <Droplets className="h-7 w-7 text-primary" />
                                      <span className="font-bold text-lg">{routeInfo.cost.fuelNeeded} لتر</span>
                                      <span className="text-xs text-muted-foreground">الوقود المطلوب</span>
                                  </div>
                                  <div className="flex flex-col items-center gap-1">
                                      <CircleDollarSign className="h-7 w-7 text-primary" />
                                      <span className="font-bold text-lg">{routeInfo.cost.totalCost} شيكل</span>
                                      <span className="text-xs text-muted-foreground">التكلفة الإجمالية</span>
                                  </div>
                              </div>
                          ) : (
                            <p className="text-muted-foreground text-center">لا يمكن حساب التكلفة.</p>
                          )}
                      </CardContent>
                  </Card>
                  <Card className="md:col-span-2">
                      <CardHeader><CardTitle className="flex items-center"><Sparkles className="ml-2" /> نصائح ذكية للسفر</CardTitle></CardHeader>
                      <CardContent>
                          {loading && !routeInfo ? (
                          <div className="space-y-2"><div className="h-24 bg-muted rounded w-full animate-pulse"></div></div>
                          ) : routeInfo ? (
                          <ScrollArea className="h-40 pr-4">
                              <div className="whitespace-pre-wrap font-body text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: routeInfo.tips }} />
                          </ScrollArea>
                          ) : null}
                      </CardContent>
                  </Card>
                  <Card className="md:col-span-2">
                      <CardHeader><CardTitle className="flex items-center"><Fuel className="ml-2" /> محطات وقود على الطريق</CardTitle></CardHeader>
                      <CardContent>
                           {loading && !routeInfo ? (
                               <div className="space-y-4"><div className="h-24 bg-muted rounded w-full animate-pulse"></div></div>
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
