"use client";

import { useEffect, useRef } from 'react';
import type { LatLngTuple } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { decode } from 'polyline-encoded';


interface MapProps {
    routeGeometry?: [number, number][];
}

// Fix for marker icons
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


export default function Map({ routeGeometry }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  const center: LatLngTuple = [31.9466, 35.3027]; // Center of Palestine

  // Initialize map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: center,
        zoom: 8,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
    }
    
    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center]);

  // Update route polyline
  useEffect(() => {
    if (mapRef.current) {
        // Remove old route layer if it exists
        if (routeLayerRef.current) {
            routeLayerRef.current.remove();
            routeLayerRef.current = null;
        }

        if (routeGeometry && routeGeometry.length > 0) {
            const positions: LatLngTuple[] = routeGeometry.map(p => [p[0], p[1]]);
            
            routeLayerRef.current = L.polyline(positions, { color: 'blue' }).addTo(mapRef.current);

            // Fit map to route bounds
            if (positions.length > 0) {
              mapRef.current.fitBounds(L.latLngBounds(positions), { padding: [50, 50] });
            }
        } else {
           // If no route, reset to center
           mapRef.current.setView(center, 8);
        }
    }
  }, [routeGeometry, center]);


  return (
    <div 
      ref={mapContainerRef} 
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg shadow-md"
    />
  );
}