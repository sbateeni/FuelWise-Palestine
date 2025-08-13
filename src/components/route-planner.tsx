
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
  PlayCircle,
  StopCircle,
  TrendingUp,
  Milestone,
  Route,
  Trash2,
  Star,
  List
} from "lucide-react";
import { Suspense } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import type { RouteInfo, FuelCostFormValues, VehicleProfile, FavoriteTrip } from "@/lib/types";
import { fuelCostSchema } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getAllFuelPrices, getVehicleProfile, saveVehicleProfile, getFuelPrice, getFavoriteTrips, saveFavoriteTrip, deleteFavoriteTrip } from "@/lib/db";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AutocompleteInput } from './autocomplete-input';
import Map from './map';

const vehicleClasses = ["Passenger Car", "SUV", "Van", "Bus", "Truck", "Motorcycle"];

export function RoutePlanner() {
  const [routeInfo, setRouteInfo] = React.useState<RouteInfo | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingConsumption, setLoadingConsumption] = React.useState(false);
  const { toast } = useToast();
  const [fuelTypes, setFuelTypes] = React.useState<string[]>([]);
  const [favoriteTrips, setFavoriteTrips] = React.useState<FavoriteTrip[]>([]);

  const [isTripActive, setIsTripActive] = React.useState(false);
  const [currentPosition, setCurrentPosition] = React.useState<[number, number] | null>(null);
  const [currentSpeed, setCurrentSpeed] = React.useState(0);
  const [distanceTraveled, setDistanceTraveled] = React.useState(0);
  const [fuelConsumed, setFuelConsumed] = React.useState(0);
  const [tripCost, setTripCost] = React.useState(0);
  const watchIdRef = React.useRef<number | null>(null);
  const tripMetricsRef = React.useRef({ consumption: 0, fuelPrice: 0 });
  
  const form = useForm<FuelCostFormValues>({
    resolver: zodResolver(fuelCostSchema),
    defaultValues: {
      start: "",
      end: "",
      manufacturer: "",
      model: "",
      year: new Date().getFullYear(),
      vehicleClass: "Passenger Car",
      fuelType: "Gasoline 95",
      consumption: 8,
    },
  });

  const loadFavoriteTrips = React.useCallback(async () => {
    const trips = await getFavoriteTrips();
    setFavoriteTrips(trips);
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        const [prices, profile, favTrips] = await Promise.all([
          getAllFuelPrices(),
          getVehicleProfile(),
          getFavoriteTrips()
        ]);
        
        if (isMounted) {
            const priceKeys = Object.keys(prices);
            setFuelTypes(priceKeys);
            setFavoriteTrips(favTrips);

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
        if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
    };
  }, [form, toast, loadFavoriteTrips]);


  const getDirections = React.useCallback(async (data: FuelCostFormValues) => {
    setLoading(true);
    setRouteInfo(null);
    if(isTripActive) stopTrip();

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
  }, [toast, isTripActive]);

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
  
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const startTrip = async () => {
    if (!navigator.geolocation) {
        toast({ variant: "destructive", title: "GPS not supported" });
        return;
    }

    const { consumption, fuelType } = form.getValues();
    const price = await getFuelPrice(fuelType);

    if (!price || !consumption) {
        toast({ variant: "destructive", title: "Vehicle Data Missing" });
        return;
    }

    tripMetricsRef.current = { consumption, fuelPrice: price };
    let lastPosition: GeolocationPosition | null = null;

    const watchId = navigator.geolocation.watchPosition(
        (position) => {
            setCurrentPosition([position.coords.latitude, position.coords.longitude]);
            setCurrentSpeed(position.coords.speed ? position.coords.speed * 3.6 : 0);
            
            let newDistance = 0;
            if (lastPosition) {
                newDistance = calculateDistance(
                    lastPosition.coords.latitude, lastPosition.coords.longitude,
                    position.coords.latitude, position.coords.longitude
                );
            }
            
            if (newDistance > 0) {
                 setDistanceTraveled(prevDist => {
                    const totalDistance = prevDist + newDistance;
                    const { consumption, fuelPrice } = tripMetricsRef.current;
                    const consumed = (totalDistance / 100) * consumption;
                    const cost = consumed * fuelPrice;
                    setFuelConsumed(consumed);
                    setTripCost(cost);
                    return totalDistance;
                 });
            }
            lastPosition = position;
        },
        (error) => {
            toast({ variant: "destructive", title: "GPS Error", description: error.message });
            setIsTripActive(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    watchIdRef.current = watchId;
    setIsTripActive(true);
    setDistanceTraveled(0);
    setFuelConsumed(0);
    setTripCost(0);
    toast({ title: "Trip Started!" });
  }

  const stopTrip = () => {
      if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
      }
      setIsTripActive(false);
      setCurrentSpeed(0);
      setCurrentPosition(null);
      toast({ title: "Trip Stopped" });
  }

  const handleSaveFavorite = async () => {
    const { start, end } = form.getValues();
    if (!start || !end) {
        toast({ variant: 'destructive', title: 'Cannot Save', description: 'Start and end points are required.' });
        return;
    }
    const name = prompt("Enter a name for this favorite trip:", `${start} to ${end}`);
    if (name) {
        await saveFavoriteTrip({ name, start, end });
        loadFavoriteTrips();
        toast({ title: 'Trip Saved!' });
    }
  }

  const handleLoadFavorite = (trip: FavoriteTrip) => {
      form.setValue('start', trip.start);
      form.setValue('end', trip.end);
      toast({ title: 'Favorite Loaded!', description: `Loaded trip from ${trip.start} to ${trip.end}` });
  }

  const handleDeleteFavorite = async (id: string) => {
      if (confirm('Are you sure you want to delete this favorite trip?')) {
          await deleteFavoriteTrip(id);
          loadFavoriteTrips();
          toast({ title: 'Favorite Deleted' });
      }
  }

  return (
    <div className="w-full mx-auto" dir="ltr">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl font-headline tracking-wider">Plan Your Journey</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(getDirections)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="start" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel><MapPin className="inline-block me-2 h-4 w-4 text-primary" /> Starting Point</FormLabel>
                          <FormControl>
                              <AutocompleteInput {...field} onChange={field.onChange} value={field.value} formFieldName="start" placeholder="e.g., Ramallah" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    <FormField control={form.control} name="end" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel><MapPin className="inline-block me-2 h-4 w-4 text-primary" /> Destination</FormLabel>
                           <FormControl>
                              <AutocompleteInput {...field} onChange={field.onChange} value={field.value} formFieldName="end" placeholder="e.g., Nablus" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                  </div>
                  <Separator className="my-6 border-primary/20" />
                   <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="manufacturer" render={({ field }) => (
                      <FormItem>
                        <FormLabel><Building className="inline-block me-2 h-4 w-4 text-primary" /> Manufacturer</FormLabel>
                        <FormControl><Input placeholder="e.g., VW" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={form.control} name="model" render={({ field }) => (
                      <FormItem>
                        <FormLabel><CarTaxiFront className="inline-block me-2 h-4 w-4 text-primary" /> Model</FormLabel>
                        <FormControl><Input placeholder="e.g., Golf" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="year" render={({ field }) => (
                      <FormItem>
                        <FormLabel><CalendarDays className="inline-block me-2 h-4 w-4 text-primary" /> Year</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 2022" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="vehicleClass" render={({ field }) => (
                      <FormItem>
                        <FormLabel><Layers3 className="inline-block me-2 h-4 w-4 text-primary" /> Vehicle Class</FormLabel>
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
                        <FormLabel><Fuel className="inline-block me-2 h-4 w-4 text-primary" /> Fuel Type</FormLabel>
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
                          <FormLabel><Gauge className="inline-block me-2 h-4 w-4 text-primary" /> Consumption (L/100km)</FormLabel>
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
                  <div className="flex items-center gap-2 mt-6">
                    <Button type="submit" disabled={loading || isTripActive} className="w-full font-bold">
                        {loading ? (
                        <>
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            Calculating...
                        </>
                        ) : (
                        <>
                            <Route className="me-2 h-4 w-4" />
                            Calculate Route & Cost
                        </>
                        )}
                    </Button>
                     <Popover>
                        <PopoverTrigger asChild>
                           <Button type="button" variant="outline"><Star className="h-4 w-4" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="space-y-4">
                                <h4 className="font-medium leading-none">Favorite Trips</h4>
                                <Button size="sm" className="w-full" onClick={handleSaveFavorite}><Save className="me-2 h-4 w-4"/>Save Current Trip</Button>
                                <Separator />
                                <ScrollArea className="h-48">
                                    <div className="space-y-2">
                                        {favoriteTrips.length > 0 ? favoriteTrips.map(trip => (
                                            <div key={trip.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/10">
                                                <button className="flex-grow text-left" onClick={() => handleLoadFavorite(trip)}>
                                                    <p className="font-semibold">{trip.name}</p>
                                                    <p className="text-sm text-muted-foreground">{trip.start} → {trip.end}</p>
                                                </button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500/70 hover:text-red-500" onClick={() => handleDeleteFavorite(trip.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )) : <p className="text-sm text-muted-foreground text-center p-4">No favorite trips saved yet.</p>}
                                    </div>
                                </ScrollArea>
                            </div>
                        </PopoverContent>
                    </Popover>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card className="flex-grow min-h-[400px] lg:min-h-[550px] bg-card/80 backdrop-blur-sm border-primary/20">
              <CardContent className="p-0 h-full w-full">
                <Suspense fallback={<div className="h-full w-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>}>
                  <Map routeGeometry={routeInfo?.routeGeometry} livePosition={currentPosition} />
                </Suspense>
              </CardContent>
          </Card>
          
           <Card className="md:col-span-2 bg-card/80 backdrop-blur-sm border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center text-xl font-headline tracking-wider">
                      {isTripActive ? <StopCircle className="me-3 text-red-500" /> : <PlayCircle className="me-3 text-green-500" />}
                      {isTripActive ? "Live Trip Active" : "Start Live Trip"}
                  </CardTitle>
                  <Button onClick={isTripActive ? stopTrip : startTrip} disabled={loading} size="sm" variant={isTripActive ? 'destructive' : 'default'} className="font-bold">
                      {isTripActive ? 'Stop Trip' : 'Start Trip'}
                  </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg bg-secondary/80">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg font-headline">{currentSpeed.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">km/h</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg bg-secondary/80">
                    <Milestone className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg font-headline">{distanceTraveled.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">km Traveled</span>
                  </div>
                   <div className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg bg-secondary/80">
                    <Droplets className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg font-headline">{fuelConsumed.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">Liters Consumed</span>
                  </div>
                   <div className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg bg-secondary/80">
                    <CircleDollarSign className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg font-headline">{tripCost.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">ILS Cost</span>
                  </div>
                </div>
              </CardContent>
          </Card>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                   <CardHeader><CardTitle className="flex items-center font-headline tracking-wider"><Waypoints className="me-3 text-primary" /> Trip Details</CardTitle></CardHeader>
                   <CardContent>
                       {loading ? (
                           <div className="space-y-4"><div className="h-20 bg-muted/50 rounded w-full animate-pulse"></div></div>
                       ) : routeInfo ? (
                           <div className="space-y-4">
                               <div className="flex justify-around text-center">
                                   <div className="flex flex-col items-center gap-1">
                                       <Navigation className="h-7 w-7 text-primary" />
                                       <span className="font-bold text-xl font-headline">{routeInfo.distance}</span>
                                       <span className="text-xs text-muted-foreground">Distance</span>
                                   </div>
                                   <div className="flex flex-col items-center gap-1">
                                       <Clock className="h-7 w-7 text-primary" />
                                       <span className="font-bold text-xl font-headline">{routeInfo.duration}</span>
                                       <span className="text-xs text-muted-foreground">Duration</span>
                                   </div>
                               </div>
                           </div>
                       ) : <p className="text-muted-foreground text-center p-4">Calculate a route to see details.</p>}
                   </CardContent>
               </Card>
                <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                   <CardHeader><CardTitle className="flex items-center font-headline tracking-wider"><CircleDollarSign className="me-3 text-primary" /> Est. Fuel Cost</CardTitle></CardHeader>
                   <CardContent>
                       {loading ? (
                           <div className="space-y-4"><div className="h-20 bg-muted/50 rounded w-full animate-pulse"></div></div>
                       ) : routeInfo && routeInfo.cost ? (
                           <div className="flex justify-around text-center">
                               <div className="flex flex-col items-center gap-1">
                                   <Droplets className="h-7 w-7 text-primary" />
                                   <span className="font-bold text-xl font-headline">{routeInfo.cost.fuelNeeded} L</span>
                                   <span className="text-xs text-muted-foreground">Fuel Needed</span>
                               </div>
                               <div className="flex flex-col items-center gap-1">
                                   <CircleDollarSign className="h-7 w-7 text-primary" />
                                   <span className="font-bold text-xl font-headline">{routeInfo.cost.totalCost} ILS</span>
                                   <span className="text-xs text-muted-foreground">Total Cost</span>
                               </div>
                           </div>
                       ) : (
                         <p className="text-muted-foreground text-center p-4">Cost information will appear here.</p>
                       )}
                   </CardContent>
               </Card>

                <Card className="md:col-span-2 bg-card/80 backdrop-blur-sm border-primary/20">
                   <CardHeader><CardTitle className="flex items-center font-headline tracking-wider"><List className="me-3 text-primary" /> Turn-by-Turn Directions</CardTitle></CardHeader>
                   <CardContent>
                       {loading ? (
                       <div className="space-y-2"><div className="h-40 bg-muted/50 rounded w-full animate-pulse"></div></div>
                       ) : routeInfo && routeInfo.steps.length > 0 ? (
                       <ScrollArea className="h-48 pe-4">
                           <ol className="space-y-3 list-decimal list-inside">
                               {routeInfo.steps.map((step, index) => (
                                   <li key={index} className="flex items-start gap-3 p-2 bg-secondary/50 rounded-md">
                                       <div className="flex-grow">
                                           <p className="font-semibold">{step.instruction}</p>
                                           <p className="text-sm text-muted-foreground">{step.distance}</p>
                                       </div>
                                   </li>
                               ))}
                           </ol>
                       </ScrollArea>
                       ) : <p className="text-muted-foreground p-4 text-center">Directions for your journey will be shown here.</p>}
                   </CardContent>
               </Card>

               <Card className="md:col-span-2 bg-card/80 backdrop-blur-sm border-primary/20">
                   <CardHeader><CardTitle className="flex items-center font-headline tracking-wider"><Sparkles className="me-3 text-primary" /> Smart Travel Tips</CardTitle></CardHeader>
                   <CardContent>
                       {loading ? (
                       <div className="space-y-2"><div className="h-40 bg-muted/50 rounded w-full animate-pulse"></div></div>
                       ) : routeInfo ? (
                       <ScrollArea className="h-48 pe-4">
                           <div className="whitespace-pre-wrap font-body text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: routeInfo.tips.replace(/\\n/g, '<br />').replace(/\* \s*/g, '• ') }} />
                       </ScrollArea>
                       ) : <p className="text-muted-foreground p-4 text-center">Tips for your journey will be shown here.</p>}
                   </CardContent>
               </Card>
               
               <Card className="md:col-span-2 bg-card/80 backdrop-blur-sm border-primary/20">
                   <CardHeader><CardTitle className="flex items-center font-headline tracking-wider"><Fuel className="me-3 text-primary" /> Gas Stations on Route</CardTitle></CardHeader>
                   <CardContent>
                        {loading ? (
                            <div className="space-y-4"><div className="h-40 bg-muted/50 rounded w-full animate-pulse"></div></div>
                        ) : routeInfo && routeInfo.gasStations.length > 0 ? (
                           <ScrollArea className="h-48 pe-4">
                               <ul className="space-y-3">
                                   {routeInfo.gasStations.map((station, index) => (
                                       <li key={index} className="flex items-center p-3 bg-secondary/50 rounded-md">
                                           <Fuel className="w-5 h-5 me-4 text-primary" />
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
                           <p className="text-muted-foreground p-4 text-center">Suggested gas stations will be listed here.</p>
                        )}
                   </CardContent>
               </Card>
           </div>
        </div>
      </div>
    </div>
  );
}

    