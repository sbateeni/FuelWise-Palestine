"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRef } from "react";
import type { LatLngTuple } from 'leaflet';


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

interface MapProps {
    routeGeometry?: [number, number][];
}


export default function Map({ routeGeometry }: MapProps) {
  const mapRef = useRef(null);
  const center: LatLngTuple = [31.9466, 35.3027]; // Center of Palestine

  const positions: LatLngTuple[] | undefined = routeGeometry?.map(p => [p[0], p[1]]);


  return (
    <MapContainer
        center={center}
        zoom={8}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positions && (
        <Polyline
            pathOptions={{ color: 'blue' }}
            positions={positions}
        />
        )}
       <Marker position={center}>
        <Popup>فلسطين</Popup>
      </Marker>
    </MapContainer>
  );
}
