'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onPositionChange: (lat: number, lng: number) => void;
  onAddressChange?: (address: string) => void;
}

// Custom draggable marker using divIcon (avoids webpack image issues)
function createDraggableIcon() {
  return L.divIcon({
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background-color: #17A34A;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: grab;
      "></div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'es' } }
    );
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

function DragMarker({
  latitude,
  longitude,
  onPositionChange,
  onAddressChange,
}: MapPickerProps) {
  const markerRef = useRef<L.Marker>(null);

  const handlePositionChange = async (lat: number, lng: number) => {
    onPositionChange(lat, lng);
    if (onAddressChange) {
      const address = await reverseGeocode(lat, lng);
      if (address) onAddressChange(address);
    }
  };

  useMapEvents({
    click(e) {
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
        handlePositionChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const pos = marker.getLatLng();
        handlePositionChange(pos.lat, pos.lng);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[latitude, longitude]}
      ref={markerRef}
      icon={createDraggableIcon()}
    />
  );
}

export default function MapPicker({ latitude, longitude, onPositionChange, onAddressChange }: MapPickerProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={14}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <DragMarker
        latitude={latitude}
        longitude={longitude}
        onPositionChange={onPositionChange}
        onAddressChange={onAddressChange}
      />
    </MapContainer>
  );
}
