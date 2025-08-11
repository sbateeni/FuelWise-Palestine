"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import L from 'leaflet';
import { CalculationResult } from '@/lib/types';
import { useEffect, useState, memo } from 'react';
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

// This component handles updating the map view and drawing markers/routes
function MapUpdater({ result }: { result: CalculationResult | null }) {
    const map = useMap();

    useEffect(() => {
        if (result?.route && result.route.length > 0) {
            try {
                const bounds = L.latLngBounds(result.route);
                if(bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                } else {
                    map.setView(PalestineCenter, 8);
                }
            } catch (e) {
                console.error("Error fitting bounds for route:", e);
                map.setView(PalestineCenter, 8);
            }
        } else if (result?.startCoords && result?.endCoords) {
             const bounds = L.latLngBounds([result.startCoords, result.endCoords]);
             if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
             } else {
                map.setView(PalestineCenter, 8);
             }
        } else {
            // Do not reset view if there is no result, to avoid weird zoom out on form clear
            // map.setView(PalestineCenter, 8);
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


// This wrapper ensures MapContainer is only rendered on the client and only once.
const MapWrapper = memo(function MapComponent({ result }: MapProps) {
    return (
        <MapContainer
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
});
MapWrapper.displayName = 'MapWrapper';


const Map = ({ result }: MapProps) => {
    // We use a placeholder to avoid rendering MapContainer on server
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return <div style={{ height: '100%', width: '100%', backgroundColor: '#e5e5e5' }} />;
    }
    
    return <MapWrapper result={result} />;
};


export default Map;
