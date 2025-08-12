"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { ArrowLeftRight, CalendarDays, Car, CircleDollarSign, Droplets, Fuel, Gauge, Layers3, Loader2, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { calculateFuelCost, getPlaceSuggestions } from "@/app/actions"
import { fuelCostSchema, type FuelCostFormValues, type CalculationResult } from "@/lib/types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const vehicleClasses = ["سيارة ركاب", "شاحنة صغيرة", "حافلة", "دراجة نارية"]
const fuelTypes = ["بنزين 95", "بنزين 98", "سولار"]

const AutocompleteInput = ({
  name,
  label,
  placeholder,
  form,
}: {
  name: "start" | "end"
  label: string
  placeholder: string
  form: any
}) => {
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const value = form.watch(name);

  const handleInputChange = React.useCallback(
    async (inputValue: string) => {
      if (inputValue.length > 1) {
        setLoading(true)
        try {
            const result = await getPlaceSuggestions(inputValue)
            setSuggestions(result)
            setOpen(result.length > 0)
        } catch (e) {
            setSuggestions([])
            setOpen(false)
        } finally {
            setLoading(false)
        }
      } else {
        setSuggestions([])
        setOpen(false)
      }
    },
    []
  );

  const debouncedFetch = React.useCallback(
    (inputValue: string) => {
      const handler = setTimeout(() => {
        handleInputChange(inputValue)
      }, 300)

      return () => clearTimeout(handler)
    },
    [handleInputChange]
  );

  React.useEffect(() => {
    if (value) {
      debouncedFetch(value)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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
            <PopoverTrigger asChild>
              <FormControl>
                <Input
                  placeholder={placeholder}
                  {...field}
                  autoComplete="off"
                />
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              {loading && <div className="p-2 text-sm text-muted-foreground">جاري البحث...</div>}
              {!loading && suggestions.length > 0 && (
                <div className="flex flex-col">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        form.setValue(name, suggestion)
                        setSuggestions([])
                        setOpen(false)
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};


export function FuelCostCalculator() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [result, setResult] = React.useState<CalculationResult | null>(null)
  const { toast } = useToast()

  const form = useForm<FuelCostFormValues>({
    resolver: zodResolver(fuelCostSchema),
    defaultValues: {
      start: "",
      end: "",
      vehicleType: "",
      year: new Date().getFullYear(),
      vehicleClass: "سيارة ركاب",
      fuelType: "بنزين 95",
      consumption: 8,
    },
  })

  async function onSubmit(data: FuelCostFormValues) {
    setIsLoading(true)
    setResult(null)
    const response = await calculateFuelCost(data)
    setIsLoading(false)

    if (response.success) {
      setResult(response.result)
    } else {
      toast({
        variant: "destructive",
        title: "خطأ في الحساب",
        description: response.error,
      })
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold font-headline text-primary">FuelWise Palestine</h1>
        <p className="text-muted-foreground mt-2 text-lg">حاسبة تكلفة الوقود لرحلاتك في فلسطين</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الرحلة والمركبة</CardTitle>
              <CardDescription>أدخل معلومات رحلتك ومركبتك لحساب التكلفة.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AutocompleteInput
                  form={form}
                  name="start"
                  label="نقطة الانطلاق"
                  placeholder="مثال: رام الله"
                />
                <AutocompleteInput
                  form={form}
                  name="end"
                  label="نقطة الوصول"
                  placeholder="مثال: نابلس"
                />
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                  control={form.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><Car className="inline-block ml-1 h-4 w-4" />نوع المركبة</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: VW Golf" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><CalendarDays className="inline-block ml-1 h-4 w-4" />سنة التصنيع</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="مثال: 2022" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  <FormField
                  control={form.control}
                  name="vehicleClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><Layers3 className="inline-block ml-1 h-4 w-4" />فئة المركبة</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر فئة المركبة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicleClasses.map(vc => <SelectItem key={vc} value={vc}>{vc}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fuelType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><Fuel className="inline-block ml-1 h-4 w-4" />نوع الوقود</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع الوقود" />
                          </Trigger>
                        </FormControl>
                        <SelectContent>
                          {fuelTypes.map(ft => <SelectItem key={ft} value={ft}>{ft}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                  control={form.control}
                  name="consumption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel><Gauge className="inline-block ml-1 h-4 w-4" />معدل استهلاك الوقود (لتر / 100 كم)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحساب...
                  </>
                ) : "احسب التكلفة"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {result && (
          <Card>
              <CardHeader>
                  <CardTitle>النتائج</CardTitle>
                  <CardDescription>تفاصيل تكلفة رحلتك المقدرة.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-secondary/50 p-4 rounded-lg">
                      <ArrowLeftRight className="mx-auto h-8 w-8 text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">المسافة</p>
                      <p className="text-2xl font-bold">{result.distanceKm} كم</p>
                  </div>
                    <div className="bg-secondary/50 p-4 rounded-lg">
                      <Droplets className="mx-auto h-8 w-8 text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">كمية الوقود</p>
                      <p className="text-2xl font-bold">{result.fuelNeeded} لتر</p>
                  </div>
                    <div className="bg-secondary/50 p-4 rounded-lg">
                      <Fuel className="mx-auto h-8 w-8 text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">سعر اللتر</p>
                      <p className="text-2xl font-bold">{result.fuelPrice} شيكل</p>
                  </div>
                  <div className="bg-primary/20 p-4 rounded-lg col-span-2">
                      <CircleDollarSign className="mx-auto h-8 w-8 text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">التكلفة الإجمالية</p>
                      <p className="text-3xl font-bold text-primary">{result.totalCost} شيكل</p>
                  </div>
              </CardContent>
          </Card>
      )}
    </div>
  )
}
