"use client";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Tooltip,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { useMemo } from "react";

interface MapProps {
  route?: [number, number][];
}

const Map = ({ route }: MapProps) => {
  const center: LatLngExpression = [31.9522, 35.2332]; // Default center (Jerusalem)

  const bounds = useMemo(() => {
    if (route && route.length > 0) {
      return route.map(point => [point[0], point[1]]) as LatLngExpression[];
    }
    return undefined;
  }, [route]);

  return (
    <MapContainer
      center={center}
      zoom={8}
      scrollWheelZoom={false}
      className="h-96 w-full rounded-lg shadow-inner border"
      bounds={bounds}
      boundsOptions={{ padding: [50, 50] }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {route && route.length > 0 && (
        <>
          <Polyline positions={route} color="blue" />
          <Marker position={route[0]}>
            <Tooltip permanent>نقطة البداية</Tooltip>
          </Marker>
          <Marker position={route[route.length - 1]}>
            <Tooltip permanent>نقطة الوصول</Tooltip>
          </Marker>
        </>
      )}
    </MapContainer>
  );
};

export default Map;
