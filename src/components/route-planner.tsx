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
import { getAllFuelPrices, getVehicleProfile, saveVehicleProfile, getFuelPrice } from "@/lib/db";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import Map from './map';

const vehicleClasses = ["Passenger Car", "Van", "Bus", "Motorcycle"];

export function RoutePlanner() {
  const [routeInfo, setRouteInfo] = React.useState<RouteInfo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingConsumption, setLoadingConsumption] = React.useState(false);
  const { toast } = useToast();
  const [fuelTypes, setFuelTypes] = React.useState<string[]>([]);
  
  const form = useForm<FuelCostFormValues>({
    resolver: zodResolver(fuelCostSchema),
    defaultValues: {
      start: "Ramallah",
      end: "Nablus",
      manufacturer: "",
      model: "",
      year: new Date().getFullYear(),
      vehicleClass: "Passenger Car",
      fuelType: "Gasoline 95",
      consumption: 8,
    },
  });

  React.useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        const [prices, profile] = await Promise.all([
          getAllFuelPrices(),
          getVehicleProfile()
        ]);
        
        if (isMounted) {
            const priceKeys = Object.keys(prices);
            setFuelTypes(priceKeys);

            if (profile) {
              const newValues: Partial<FuelCostFormValues> = {
                manufacturer: profile.manufacturer,
                model: profile.model,
                year: profile.year,
                vehicleClass: profile.vehicleClass,
                consumption: profile.consumption,
                fuelType: profile.fuelType || (priceKeys.length > 0 ? priceKeys[0] : ''),
              };
              form.reset({ ...form.getValues(), ...newValues });
            } else if (priceKeys.length > 0) {
              form.setValue('fuelType', priceKeys[0]);
            }
        }
      } catch (error) {
        console.error("Failed to load initial data from DB", error);
        if (isMounted) {
            toast({
              variant: "destructive",
              title: "Loading Error",
              description: "Could not load saved data.",
            });
        }
      }
    }
    loadInitialData();

    return () => {
        isMounted = false;
    };
  }, [form, toast]);

  const getDirections = React.useCallback(async (data: FuelCostFormValues) => {
    setLoading(true);
    setRouteInfo(null);
    try {
        const price = await getFuelPrice(data.fuelType);
        if (price === undefined) {
            toast({
                variant: "destructive",
                title: "Price Error",
                description: `Could not find a price for fuel type: ${data.fuelType}`,
            });
            setLoading(false);
            return;
        }

        const result = await getRouteAndTips(data, price);
        
        if (result.success) {
            setRouteInfo(result.data);
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
                title: "Vehicle Saved",
                description: "Your vehicle profile has been saved for future use.",
            });
        } else {
            toast({
                variant: "destructive",
                title: "Route Calculation Error",
                description: result.error,
            });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast({
            variant: "destructive",
            title: "Error",
            description: errorMessage,
        });
    } finally {
        setLoading(false);
    }
  }, [toast, form]);

  const fetchConsumption = React.useCallback(async () => {
    const { manufacturer, model, year } = form.getValues();
    if (!manufacturer || !model || !year) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter manufacturer, model, and year.",
      });
      return;
    }
    setLoadingConsumption(true);
    try {
        const response = await fetch(`/api/consumption?manufacturer=${manufacturer}&model=${model}&year=${year}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch data');
        }

        form.setValue('consumption', data.consumption, { shouldValidate: true });
        toast({
            title: `Consumption Fetched (${data.source === 'ai' ? 'AI' : 'Cached'})`,
            description: `Estimated consumption set to ${data.consumption} L/100km.`,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        toast({
            variant: "destructive",
            title: "Error fetching consumption",
            description: errorMessage,
        });
    } finally {
        setLoadingConsumption(false);
    }
  }, [form, toast]);
  
  return (
    <div className="w-full mx-auto" dir="ltr">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Input and Details Column */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Enter Trip & Vehicle Details</CardTitle>
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
                            <MapPin className="inline-block me-1 h-4 w-4" />
                            Starting Point
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Ramallah" {...field} />
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
                            <MapPin className="inline-block me-1 h-4 w-4" />
                            Destination
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Nablus" {...field} />
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
                        <FormLabel><Building className="inline-block me-1 h-4 w-4" /> Manufacturer</FormLabel>
                        <FormControl><Input placeholder="e.g., VW" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={form.control} name="model" render={({ field }) => (
                      <FormItem>
                        <FormLabel><CarTaxiFront className="inline-block me-1 h-4 w-4" /> Model</FormLabel>
                        <FormControl><Input placeholder="e.g., Golf" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="year" render={({ field }) => (
                      <FormItem>
                        <FormLabel><CalendarDays className="inline-block me-1 h-4 w-4" /> Year</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 2022" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="vehicleClass" render={({ field }) => (
                      <FormItem>
                        <FormLabel><Layers3 className="inline-block me-1 h-4 w-4" /> Vehicle Class</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select vehicle class" /></SelectTrigger></FormControl>
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
                        <FormLabel><Fuel className="inline-block me-1 h-4 w-4" /> Fuel Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select fuel type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {fuelTypes.map((ft) => (<SelectItem key={ft} value={ft}>{ft}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={form.control} name="consumption" render={({ field }) => (
                      <FormItem>
                          <FormLabel><Gauge className="inline-block me-1 h-4 w-4" /> Consumption (L/100km)</FormLabel>
                          <div className="flex items-center gap-2">
                              <FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                              <Button type="button" variant="outline" size="icon" onClick={fetchConsumption} disabled={loadingConsumption} aria-label="Fetch consumption automatically">
                                  {loadingConsumption ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                              </Button>
                          </div>
                          <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full mt-4">
                    {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                    {loading ? "Calculating..." : "Calculate Route & Cost"}
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
                <Suspense fallback={<div className="h-full w-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>}>
                  <Map routeGeometry={routeInfo?.routeGeometry} />
                </Suspense>
              </CardContent>
          </Card>
           {(loading || routeInfo) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                      <CardHeader><CardTitle className="flex items-center"><Waypoints className="me-2" /> Trip Details</CardTitle></CardHeader>
                      <CardContent>
                          {loading && !routeInfo ? (
                              <div className="space-y-4"><div className="h-20 bg-muted rounded w-full animate-pulse"></div></div>
                          ) : routeInfo ? (
                              <div className="space-y-4">
                                  <div className="flex justify-around text-center">
                                      <div className="flex flex-col items-center gap-1">
                                          <Navigation className="h-7 w-7 text-primary" />
                                          <span className="font-bold text-lg">{routeInfo.distance}</span>
                                          <span className="text-xs text-muted-foreground">Distance</span>
                                      </div>
                                      <div className="flex flex-col items-center gap-1">
                                          <Clock className="h-7 w-7 text-primary" />
                                          <span className="font-bold text-lg">{routeInfo.duration}</span>
                                          <span className="text-xs text-muted-foreground">Duration</span>
                                      </div>
                                  </div>
                              </div>
                          ) : null}
                      </CardContent>
                  </Card>
                   <Card>
                      <CardHeader><CardTitle className="flex items-center"><CircleDollarSign className="me-2" /> Fuel Cost</CardTitle></CardHeader>
                      <CardContent>
                          {loading && !routeInfo ? (
                              <div className="space-y-4"><div className="h-20 bg-muted rounded w-full animate-pulse"></div></div>
                          ) : routeInfo && routeInfo.cost ? (
                              <div className="flex justify-around text-center">
                                  <div className="flex flex-col items-center gap-1">
                                      <Droplets className="h-7 w-7 text-primary" />
                                      <span className="font-bold text-lg">{routeInfo.cost.fuelNeeded} L</span>
                                      <span className="text-xs text-muted-foreground">Fuel Needed</span>
                                  </div>
                                  <div className="flex flex-col items-center gap-1">
                                      <CircleDollarSign className="h-7 w-7 text-primary" />
                                      <span className="font-bold text-lg">{routeInfo.cost.totalCost} ILS</span>
                                      <span className="text-xs text-muted-foreground">Total Cost</span>
                                  </div>
                              </div>
                          ) : (
                            <p className="text-muted-foreground text-center">Cost could not be calculated.</p>
                          )}
                      </CardContent>
                  </Card>
                  <Card className="md:col-span-2">
                      <CardHeader><CardTitle className="flex items-center"><Sparkles className="me-2" /> Smart Travel Tips</CardTitle></CardHeader>
                      <CardContent>
                          {loading && !routeInfo ? (
                          <div className="space-y-2"><div className="h-24 bg-muted rounded w-full animate-pulse"></div></div>
                          ) : routeInfo ? (
                          <ScrollArea className="h-40 pe-4">
                              <div className="whitespace-pre-wrap font-body text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: routeInfo.tips.replace(/\\n/g, '<br />').replace(/\* \s*/g, '• ') }} />
                          </ScrollArea>
                          ) : null}
                      </CardContent>
                  </Card>
                  <Card className="md:col-span-2">
                      <CardHeader><CardTitle className="flex items-center"><Fuel className="me-2" /> Gas Stations on Route</CardTitle></CardHeader>
                      <CardContent>
                           {loading && !routeInfo ? (
                               <div className="space-y-4"><div className="h-24 bg-muted rounded w-full animate-pulse"></div></div>
                           ) : routeInfo && routeInfo.gasStations.length > 0 ? (
                              <ScrollArea className="h-40 pe-4">
                                  <ul className="space-y-3">
                                      {routeInfo.gasStations.map((station, index) => (
                                          <li key={index} className="flex items-center p-2 bg-secondary/30 rounded-md">
                                              <Fuel className="w-5 h-5 me-3 text-primary" />
                                              <div>
                                                  <p className="font-semibold">{station.name}</p>
                                                  <p className="text-sm text-muted-foreground flex items-center">
                                                      <MapPin className="w-3 h-3 me-1" />
                                                      {station.location}
                                                  </p>
                                              </div>
                                          </li>
                                      ))}
                                  </ul>
                              </ScrollArea>
                           ) : (
                              <p className="text-muted-foreground">No suggested gas stations for this route.</p>
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

    