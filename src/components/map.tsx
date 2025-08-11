"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import L from 'leaflet';
import { CalculationResult } from '@/lib/types';
import { useEffect } from 'react';
import * as React from 'react';

// Fix for default icon issue with webpack
if (typeof window !== 'undefined') {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
}

interface MapProps {
    result: CalculationResult | null;
}

const PalestineCenter: L.LatLngExpression = [32.2246, 35.2585]; // Nablus as a center point

function MapUpdater({ result }: { result: CalculationResult | null }) {
    const map = useMap();
    useEffect(() => {
        if (result?.route && result.route.length > 0) {
            const bounds = L.latLngBounds(result.route);
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        } else if (result?.startCoords && result?.endCoords) {
             const bounds = L.latLngBounds([result.startCoords, result.endCoords]);
             if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
             }
        } else {
             map.setView(PalestineCenter, 8);
        }
    }, [map, result]);

    return (
        <>
            {result?.startCoords && (
                <Marker position={result.startCoords}>
                    <Popup>نقطة الانطلاق</Popup>
                </Marker>
            )}
            {result?.endCoords && (
                <Marker position={result.endCoords}>
                    <Popup>نقطة الوصول</Popup>
                </Marker>
            )}
            {result?.route && <Polyline positions={result.route} color="blue" />}
        </>
    );
}

const Map = ({ result }: MapProps) => {
    // We only render the map when we have a result.
    // This prevents the re-initialization error.
    if (!result) {
        return <div style={{ height: '100%', width: '100%', backgroundColor: '#e5e5e5' }} />;
    }
    
    // Using a key on MapContainer that changes with the result might force re-renders
    // in a way that helps Leaflet. We can create a simple key from result data.
    const mapKey = result ? `${result.distanceKm}` : 'initial';

    return (
        <MapContainer
            key={mapKey}
            center={PalestineCenter}
            zoom={8}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater result={result} />
        </MapContainer>
    );
};

export default Map;