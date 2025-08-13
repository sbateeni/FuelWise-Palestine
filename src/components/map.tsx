"use client";

import { useEffect, useRef } from 'react';
import type { GeoJsonObject } from 'geojson';
import 'leaflet/dist/leaflet.css';

interface MapProps {
    routeGeometry?: GeoJsonObject;
    livePosition?: [number, number] | null;
}

export default function Map({ routeGeometry, livePosition }: MapProps) {
  const mapRef = useRef<any | null>(null); // Using any for L.Map
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routeLayerRef = useRef<any | null>(null); // Using any for L.GeoJSON
  const liveMarkerRef = useRef<any | null>(null); // Using any for L.Marker
  const LRef = useRef<any | null>(null); // To hold the Leaflet module

  const center: [number, number] = [31.9466, 35.3027]; // Center of Palestine

  useEffect(() => {
    // Dynamically import Leaflet only on the client side
    import('leaflet').then(L => {
      LRef.current = L;

      // Set up default icon
      const DefaultIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      // Initialize map
      if (mapContainerRef.current && !mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          center: center,
          zoom: 8,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapRef.current);
      }
    });

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Update route GeoJSON layer
  useEffect(() => {
    if (mapRef.current && LRef.current) {
        const L = LRef.current;
        // Remove old route layer if it exists
        if (routeLayerRef.current) {
            routeLayerRef.current.remove();
            routeLayerRef.current = null;
        }

        if (routeGeometry) {
            routeLayerRef.current = L.geoJSON(routeGeometry, {
                style: { color: 'hsl(var(--primary))', weight: 5 }
            }).addTo(mapRef.current);

            // Fit map to route bounds
            if (routeLayerRef.current.getBounds().isValid()) {
              mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
            }
        } else if (!livePosition) { // Only reset view if there's no route AND no live position
           // If no route, reset to center
           mapRef.current.setView(center, 8);
        }
    }
  }, [routeGeometry, center, livePosition]);

  // Update live position marker
  useEffect(() => {
    if (mapRef.current && LRef.current) {
        const L = LRef.current;
        if (livePosition) {
            if (liveMarkerRef.current) {
                liveMarkerRef.current.setLatLng(livePosition);
            } else {
                const liveIcon = new L.Icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
                liveMarkerRef.current = L.marker(livePosition, { icon: liveIcon }).addTo(mapRef.current);
            }
            // Center the map on the new position while maintaining zoom
             mapRef.current.setView(livePosition, mapRef.current.getZoom(), {
                animate: true,
                pan: {
                    duration: 1
                }
            });
        } else {
            // Remove marker if trip ends
            if (liveMarkerRef.current) {
                liveMarkerRef.current.remove();
                liveMarkerRef.current = null;
            }
        }
    }
  }, [livePosition]);


  return (
    <div 
      ref={mapContainerRef} 
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg shadow-md"
    />
  );
}
