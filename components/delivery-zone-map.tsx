"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface DeliveryZone {
  id: string;
  name: string;
  radiusKm: number;
  baseFeeInCents: number;
  perSheetFeeInCents: number;
}

interface DeliveryAddress {
  address: string;
  city: string;
  state: string;
  postalCode: string;
}

interface DeliveryZoneMapProps {
  deliveryZones: DeliveryZone[];
  selectedZone: string;
  onZoneSelect?: (zoneId: string, isAutoSelected?: boolean) => void;
  deliveryAddress?: DeliveryAddress;
  onOutOfRange?: () => void;
}

// Warehouse location: 16 Brewer Rd, Canning Vale, WA
const WAREHOUSE_LOCATION = {
  lat: -32.0687,
  lng: 115.9191,
};

// Zone colors (from inner to outer)
const ZONE_COLORS = [
  { fill: "#22c55e", stroke: "#16a34a" }, // Green for Perth Metro
  { fill: "#3b82f6", stroke: "#2563eb" }, // Blue for Greater Perth
  { fill: "#f59e0b", stroke: "#d97706" }, // Amber for future zones
  { fill: "#8b5cf6", stroke: "#7c3aed" }, // Purple for future zones
];

// Load Google Maps script dynamically
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

interface CircleData {
  circle: google.maps.Circle;
  zoneId: string;
  colorIndex: number;
}

// Calculate distance between two points using Haversine formula
function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function DeliveryZoneMap({
  deliveryZones,
  selectedZone,
  onZoneSelect,
  deliveryAddress,
  onOutOfRange,
}: DeliveryZoneMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const circlesRef = useRef<CircleData[]>([]);
  const deliveryMarkerRef = useRef<google.maps.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Initialize map only once
  useEffect(() => {
    if (initializedRef.current || !mapRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setLoadError("Google Maps API key not configured");
      return;
    }

    initializedRef.current = true;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: WAREHOUSE_LOCATION,
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER,
          },
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        mapInstanceRef.current = map;

        // Add warehouse marker
        new google.maps.Marker({
          position: WAREHOUSE_LOCATION,
          map,
          title: "Subtex Warehouse - 16 Brewer Rd, Canning Vale",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#000000",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        // Sort zones by radius (largest first for proper layering)
        const sortedZones = [...deliveryZones].sort(
          (a, b) => b.radiusKm - a.radiusKm
        );

        // Add delivery zone circles
        sortedZones.forEach((zone, index) => {
          const colorIndex = sortedZones.length - 1 - index;
          const colors = ZONE_COLORS[colorIndex] || ZONE_COLORS[0];
          const isSelected = zone.id === selectedZone;

          const circle = new google.maps.Circle({
            strokeColor: colors.stroke,
            strokeOpacity: isSelected ? 1 : 0.8,
            strokeWeight: isSelected ? 3 : 2,
            fillColor: colors.fill,
            fillOpacity: isSelected ? 0.35 : 0.2,
            map,
            center: WAREHOUSE_LOCATION,
            radius: zone.radiusKm * 1000,
            clickable: true,
          });

          circle.addListener("click", () => {
            if (onZoneSelect) {
              onZoneSelect(zone.id);
            }
          });

          circlesRef.current.push({
            circle,
            zoneId: zone.id,
            colorIndex,
          });
        });

        setIsLoaded(true);
      })
      .catch((error) => {
        console.error("Error loading Google Maps:", error);
        setLoadError("Failed to load map");
      });

    return () => {
      circlesRef.current.forEach(({ circle }) => circle.setMap(null));
      circlesRef.current = [];
      initializedRef.current = false;
    };
  }, [deliveryZones, selectedZone, onZoneSelect]);

  // Update circle styles when selection changes
  useEffect(() => {
    if (!isLoaded || circlesRef.current.length === 0) return;

    circlesRef.current.forEach(({ circle, zoneId, colorIndex }) => {
      const colors = ZONE_COLORS[colorIndex] || ZONE_COLORS[0];
      const isSelected = zoneId === selectedZone;

      circle.setOptions({
        strokeColor: colors.stroke,
        strokeOpacity: isSelected ? 1 : 0.8,
        strokeWeight: isSelected ? 3 : 2,
        fillOpacity: isSelected ? 0.35 : 0.2,
      });
    });
  }, [selectedZone, isLoaded]);

  // Update delivery address marker when address changes
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !window.google) return;

    // Remove existing delivery marker
    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.setMap(null);
      deliveryMarkerRef.current = null;
    }

    // If no address, nothing to do
    if (
      !deliveryAddress ||
      !deliveryAddress.address ||
      !deliveryAddress.city ||
      !deliveryAddress.postalCode
    ) {
      return;
    }

    // Geocode the address
    const geocoder = new google.maps.Geocoder();
    const fullAddress = `${deliveryAddress.address}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.postalCode}, Australia`;

    geocoder.geocode({ address: fullAddress }, (results, status) => {
      if (status === "OK" && results && results[0] && mapInstanceRef.current) {
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();

        // Calculate distance from warehouse
        const distanceKm = calculateDistanceKm(
          WAREHOUSE_LOCATION.lat,
          WAREHOUSE_LOCATION.lng,
          lat,
          lng
        );

        // Auto-select delivery zone based on distance
        // Sort zones by radius (smallest first) and find the first zone that covers the distance
        const sortedZones = [...deliveryZones].sort(
          (a, b) => a.radiusKm - b.radiusKm
        );
        const matchingZone = sortedZones.find(
          (zone) => distanceKm <= zone.radiusKm
        );

        if (matchingZone && onZoneSelect) {
          onZoneSelect(matchingZone.id, true);
        } else if (!matchingZone && onOutOfRange) {
          // Address is outside all delivery zones
          onOutOfRange();
        }

        // Create delivery marker (red dot)
        deliveryMarkerRef.current = new google.maps.Marker({
          position: location,
          map: mapInstanceRef.current,
          title: "Delivery Address",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        // Fit bounds to include both warehouse and delivery location
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(WAREHOUSE_LOCATION);
        bounds.extend(location);
        mapInstanceRef.current.fitBounds(bounds, {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        });
      }
    });
  }, [isLoaded, deliveryAddress, deliveryZones, onZoneSelect, onOutOfRange]);

  if (loadError) {
    return (
      <div className='h-[300px] rounded-lg bg-muted flex items-center justify-center text-muted-foreground'>
        <p>{loadError}</p>
      </div>
    );
  }

  return (
    <div className='relative'>
      <div
        ref={mapRef}
        className='h-[300px] rounded-lg overflow-hidden border'
      />
      {!isLoaded && (
        <div className='absolute inset-0 flex items-center justify-center bg-muted rounded-lg'>
          <div className='flex items-center gap-2 text-muted-foreground'>
            <div className='h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
            Loading map...
          </div>
        </div>
      )}
      {/* Legend */}
      <div className='absolute bottom-3 left-3 bg-white/95 dark:bg-gray-900/95 rounded-md px-3 py-2 text-xs shadow-md'>
        <div className='flex flex-col gap-1'>
          {deliveryZones
            .sort((a, b) => a.radiusKm - b.radiusKm)
            .map((zone, index) => {
              const colors = ZONE_COLORS[index] || ZONE_COLORS[0];
              return (
                <div key={zone.id} className='flex items-center gap-2'>
                  <div
                    className='w-3 h-3 rounded-full border'
                    style={{
                      backgroundColor: colors.fill,
                      borderColor: colors.stroke,
                      opacity: zone.id === selectedZone ? 1 : 0.7,
                    }}
                  />
                  <span
                    className={
                      zone.id === selectedZone ? "font-medium" : "opacity-70"
                    }
                  >
                    {zone.name} ({zone.radiusKm}km)
                  </span>
                </div>
              );
            })}
          <div className='flex items-center gap-2 mt-1 pt-1 border-t'>
            <div className='w-3 h-3 rounded-full bg-black border-2 border-white' />
            <span>Warehouse</span>
          </div>
          {deliveryAddress?.address && deliveryAddress?.city && (
            <div className='flex items-center gap-2'>
              <div className='w-3 h-3 rounded-full bg-red-500 border-2 border-white' />
              <span>Delivery</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
