"use client"
import { useState, useRef, useEffect } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface Route {
  distance: string
  duration: string
  steps: Array<{
    instruction: string
    distance: string
    duration: string
  }>
}

export default function RoutePlanner() {
  const [start, setStart] = useState<string>('')
  const [end, setEnd] = useState<string>('')
  const [route, setRoute] = useState<Route | null>(null)
  const [geminiTips, setGeminiTips] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const directionsServiceRef = useRef<google.maps.DirectionsService>()
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer>()
  const mapInstanceRef = useRef<google.maps.Map>()

  // تهيئة الخريطة عند تحميل المكون
  useEffect(() => {
    const initMap = async () => {
        if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
            console.error("Google Maps API key is missing.");
            return;
        }
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        version: 'weekly',
        libraries: ['places', 'routes']
      })

      await loader.load()
      const { Map } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
      const { DirectionsService, DirectionsRenderer } = await google.maps.importLibrary("routes") as google.maps.RoutesLibrary;

      if (mapRef.current) {
        mapInstanceRef.current = new Map(mapRef.current, {
            center: { lat: 31.9466, lng: 35.3027 }, // مركز فلسطين
            zoom: 8,
            mapId: 'DEMO_MAP_ID' // Required for advanced markers
        });

        directionsServiceRef.current = new DirectionsService()
        directionsRendererRef.current = new DirectionsRenderer({
            map: mapInstanceRef.current,
            suppressMarkers: false
        })
      }
    }

    initMap()
  }, [])

  // الحصول على الاتجاهات
  const getDirections = async () => {
    if (!start || !end) return

    setLoading(true)
    setRoute(null)
    setGeminiTips('')

    try {
      // 1. الحصول على الاتجاهات من Google Maps
      const results = await directionsServiceRef.current!.route({
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING,
        region: 'ps',
        unitSystem: google.maps.UnitSystem.METRIC
      })

      if (results.routes && results.routes.length > 0 && results.routes[0].legs && results.routes[0].legs.length > 0) {
        directionsRendererRef.current!.setDirections(results)

        // 2. تحضير بيانات المسار
        const leg = results.routes[0].legs[0];
        const routeData: Route = {
            distance: leg.distance?.text || 'غير معروف',
            duration: leg.duration?.text || 'غير معروف',
            steps: leg.steps.map(step => ({
                instruction: step.instructions?.replace(/<[^>]*>/g, '') || '',
                distance: step.distance?.text || '',
                duration: step.duration?.text || ''
            }))
        }

        setRoute(routeData)

        // 3. الحصول على نصائح من Gemini
        if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
            console.error("Gemini API key is missing.");
            setGeminiTips("مفتاح Gemini API غير موجود. لا يمكن تحميل النصائح.");
            return;
        }
        const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        const prompt = `
        أعطني نصائح للسفر بالسيارة من ${start} إلى ${end} في فلسطين مع مراعاة:
        - حالة الطرق
        - نقاط التفتيش إن وجدت
        - محطات الوقود على الطريق
        - الوقت الأمثل للسفر
        - أي تحذيرات أمنية
        
        المسافة: ${routeData.distance}
        المدة: ${routeData.duration}
        
        أجب باللغة العربية بجمل مختصرة ونقاط واضحة.
        `

        const result = await model.generateContent(prompt)
        const response = await result.response
        setGeminiTips(response.text())
      } else {
        throw new Error("No routes found.");
      }
    } catch (error) {
      console.error('Error:', error)
      alert('حدث خطأ أثناء جلب الاتجاهات. يرجى التأكد من العناوين.')
      setRoute(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4" dir="rtl">
      <h1 className="text-3xl font-bold text-center mb-6 text-primary">مخطط الرحلات الذكي في فلسطين</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* مدخلات المستخدم */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>ادخل تفاصيل رحلتك</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="start-point" className="block mb-2 font-medium">نقطة البداية</Label>
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
              <Label htmlFor="end-point" className="block mb-2 font-medium">نقطة الوصول</Label>
              <Input
                id="end-point"
                type="text"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                placeholder="مثال: غزة"
                className="w-full p-2"
              />
            </div>
            
            <Button
              onClick={getDirections}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {loading ? 'جاري البحث...' : 'عرض الاتجاهات والنصائح'}
            </Button>
          </CardContent>
        </Card>

        {/* الخريطة */}
        <div className="lg:col-span-2">
          <div ref={mapRef} className="h-96 w-full rounded-lg shadow border" />
        </div>
      </div>

      {/* نتائج الاتجاهات */}
      {(route || loading) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
                <CardTitle>تفاصيل الرحلة</CardTitle>
            </CardHeader>
            <CardContent>
            {loading && !route ? (
                <p>جاري تحميل تفاصيل الرحلة...</p>
            ) : route ? (
              <div className="space-y-2">
                <p><strong>المسافة:</strong> {route.distance}</p>
                <p><strong>المدة:</strong> {route.duration}</p>
                
                <h3 className="font-bold pt-4 text-lg">خطوات الرحلة:</h3>
                <ol className="list-decimal list-inside space-y-2 max-h-60 overflow-y-auto pr-4">
                  {route.steps.map((step, index) => (
                    <li key={index}>
                      {step.instruction} <strong>({step.distance})</strong>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            </CardContent>
          </Card>

          {/* نصائح Gemini */}
          <Card>
            <CardHeader>
                <CardTitle>نصائح ذكية للسفر</CardTitle>
            </CardHeader>
            <CardContent>
            {loading && !geminiTips ? (
                <p>جاري تحميل النصائح...</p>
            ) : geminiTips ? (
              <div className="whitespace-pre-wrap font-body text-sm">{geminiTips}</div>
            ) : null }
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Re-export shadcn components to be used in the planner
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

