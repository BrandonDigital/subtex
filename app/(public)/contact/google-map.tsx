"use client";

interface GoogleMapEmbedProps {
  address: string;
  className?: string;
}

// Simple iframe version that works without API key
export function GoogleMapEmbed({
  address,
  className = "",
}: GoogleMapEmbedProps) {
  // Use the free embed URL format
  const encodedAddress = encodeURIComponent(address);
  const embedUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=m&z=15&output=embed&iwloc=near`;

  return (
    <div className={`w-full h-full ${className}`}>
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Map showing ${address}`}
      />
    </div>
  );
}

// Interactive version using Google Maps Embed API (requires API key)
interface GoogleMapInteractiveProps {
  address: string;
  apiKey?: string;
  className?: string;
}

export function GoogleMapInteractive({
  address,
  apiKey,
  className = "",
}: GoogleMapInteractiveProps) {
  const key = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!key) {
    // Fallback to simple embed if no API key
    return <GoogleMapEmbed address={address} className={className} />;
  }

  const encodedAddress = encodeURIComponent(address);
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodedAddress}`;

  return (
    <div className={`w-full h-full ${className}`}>
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Map showing ${address}`}
      />
    </div>
  );
}
