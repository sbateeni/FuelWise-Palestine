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
  Car,
  CalendarDays,
  Layers3,
  Gauge,
  Droplets,
  CircleDollarSign,
} from "lucide-react";
import { Suspense } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getRouteAndTips, getPlaceSuggestions } from "@/app/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RouteInfo, FuelCostFormValues } from "@/lib/types";
import { fuelCostSchema } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getAllFuelPrices } from "@/lib/db";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const Map = dynamic(() => import('@/components/map'), { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted flex items-center justify-center"><p>جاري تحميل الخريطة...</p></div>
});

const vehicleClasses = ["سيارة ركاب", "شاحنة صغيرة", "حافلة", "دراجة نارية"];

const AutocompleteInput = ({
  name,
  label,
  placeholder,
  form,
}: {
  name: "start" | "end";
  label: string;
  placeholder: string;
  form: any;
}) => {
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const [inputValue, setInputValue] = React.useState(form.getValues(name) || "");
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const handleSuggestionsFetch = React.useCallback(async (value: string) => {
    if (value.length > 1) {
      setLoading(true);
      try {
        const result = await getPlaceSuggestions(value);
        setSuggestions(result);
        if (result.length > 0) setOpen(true);
        else setOpen(false);
      } catch (e) {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  }, []);

  const debouncedFetch = React.useCallback(
    (value: string) => {
      const handler = setTimeout(() => {
        handleSuggestionsFetch(value);
      }, 300);

      return () => clearTimeout(handler);
    },
    [handleSuggestionsFetch]
  );

  const handleLocalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    form.setValue(name, value, { shouldValidate: true, shouldDirty: true });
    debouncedFetch(value);
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <MapPin className="inline-block ml-1 h-4 w-4" />
            {label}
          </FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild ref={triggerRef}>
              <FormControl>
                <Input
                  placeholder={placeholder}
                  {...field}
                  value={inputValue}
                  onChange={handleLocalInputChange}
                  onClick={() => {
                    if (suggestions.length > 0) {
                      setOpen(true);
                    }
                  }}
                  autoComplete="off"
                />
              </FormControl>
            </PopoverTrigger>
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {loading ? (
                <div className="p-2 text-sm text-muted-foreground flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري البحث...
                </div>
              ) : suggestions.length > 0 ? (
                <div className="flex flex-col max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="ghost"
                      className="justify-start text-right"
                      onClick={() => {
                        form.setValue(name, suggestion);
                        setInputValue(suggestion);
                        setOpen(false);
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              ) : !loading && inputValue && inputValue.length > 1 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  لا توجد نتائج
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};


export function RoutePlanner() {
  const [routeInfo, setRouteInfo] = React.useState<RouteInfo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const [fuelTypes, setFuelTypes] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    async function loadFuelTypes() {
      try {
        const prices = await getAllFuelPrices();
        setFuelTypes(Object.keys(prices));
      } catch (error) {
        console.error("Failed to load fuel prices from DB", error);
        toast({
          variant: "destructive",
          title: "خطأ",
          description: "لم نتمكن من تحميل أسعار الوقود.",
        });
      }
    }
    loadFuelTypes();
  }, [toast]);

  const form = useForm<FuelCostFormValues>({
    resolver: zodResolver(fuelCostSchema),
    defaultValues: {
      start: "رام الله",
      end: "نابلس",
      vehicleType: "VW Golf",
      year: new Date().getFullYear(),
      vehicleClass: "سيارة ركاب",
      fuelType: "بنزين 95",
      consumption: 8,
    },
  });

  const getDirections = React.useCallback(async (data: FuelCostFormValues) => {
    setLoading(true);
    setRouteInfo(null);

    const result = await getRouteAndTips(data);
    if (result.success) {
      setRouteInfo(result.data);
    } else {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: result.error,
      });
    }
    setLoading(false);
  }, [toast]);
  
  // Fetch initial route on component mount
  React.useEffect(() => {
    getDirections(form.getValues());
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
                    <AutocompleteInput form={form} name="start" label="نقطة الانطلاق" placeholder="مثال: رام الله" />
                    <AutocompleteInput form={form} name="end" label="نقطة الوصول" placeholder="مثال: نابلس" />
                  </div>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="vehicleType" render={({ field }) => (
                      <FormItem>
                        <FormLabel><Car className="inline-block ml-1 h-4 w-4" /> نوع المركبة</FormLabel>
                        <FormControl><Input placeholder="مثال: VW Golf" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="year" render={({ field }) => (
                      <FormItem>
                        <FormLabel><CalendarDays className="inline-block ml-1 h-4 w-4" /> سنة التصنيع</FormLabel>
                        <FormControl><Input type="number" placeholder="مثال: 2022" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="vehicleClass" render={({ field }) => (
                      <FormItem>
                        <FormLabel><Layers3 className="inline-block ml-1 h-4 w-4" /> فئة المركبة</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر فئة المركبة" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {vehicleClasses.map((vc) => (<SelectItem key={vc} value={vc}>{vc}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="fuelType" render={({ field }) => (
                      <FormItem>
                        <FormLabel><Fuel className="inline-block ml-1 h-4 w-4" /> نوع الوقود</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر نوع الوقود" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {fuelTypes.map((ft) => (<SelectItem key={ft} value={ft}>{ft}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="mt-4">
                    <FormField control={form.control} name="consumption" render={({ field }) => (
                      <FormItem>
                        <FormLabel><Gauge className="inline-block ml-1 h-4 w-4" /> معدل استهلاك الوقود (لتر / 100 كم)</FormLabel>
                        <FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full mt-4">
                    {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    {loading ? "جاري الحساب..." : "احسب المسار والتكلفة"}
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
