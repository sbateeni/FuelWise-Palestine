"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import L from 'leaflet';
import { CalculationResult } from '@/lib/types';
import { useEffect } from 'react';

// Fix for default icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


interface MapProps {
    result: CalculationResult | null;
}

const PalestineCenter: L.LatLngExpression = [32.2246, 35.2585]; // Nablus as a center point

function ChangeView({ result }: { result: CalculationResult | null }) {
    const map = useMap();
    useEffect(() => {
        if (result?.route) {
            map.fitBounds(result.route);
        } else {
            map.setView(PalestineCenter, 8);
        }
    }, [map, result]);
    return null;
}


export default function Map({ result }: MapProps) {
    const startPosition = result?.startCoords;
    const endPosition = result?.endCoords;
    const route = result?.route

    return (
        <MapContainer center={PalestineCenter} zoom={8} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {startPosition && (
                <Marker position={startPosition}>
                    <Popup>نقطة الانطلاق</Popup>
                </Marker>
            )}
            {endPosition && (
                <Marker position={endPosition}>
                    <Popup>نقطة الوصول</Popup>
                </Marker>
            )}
            {route && <Polyline positions={route} color="blue" />}
            <ChangeView result={result} />
        </MapContainer>
    );
}
