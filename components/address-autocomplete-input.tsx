"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MapPin, Loader2 } from "lucide-react";

export interface AddressComponents {
  street: string;
  unit: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  placeId: string;
  formattedAddress: string;
}

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: AddressComponents) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Load Google Maps script dynamically
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (existingScript) {
      const checkLoaded = () => {
        if (window.google?.maps?.places) {
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const checkLoaded = () => {
        if (window.google?.maps?.places) {
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

interface PlacePrediction {
  placeId: string;
  text: {
    text: string;
    matches?: Array<{ startOffset: number; endOffset: number }>;
  };
  structuredFormat?: {
    mainText: { text: string };
    secondaryText: { text: string };
  };
}

export function AddressAutocompleteInput({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing an address...",
  disabled = false,
  className,
}: AddressAutocompleteInputProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key not configured");
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        setIsLoaded(true);
        sessionTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();
      })
      .catch((error) => {
        console.error("Error loading Google Maps:", error);
      });
  }, []);

  // Fetch autocomplete suggestions using the new API
  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!isLoaded || !input || input.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);

      try {
        const request: google.maps.places.AutocompleteRequest = {
          input,
          sessionToken: sessionTokenRef.current!,
          includedRegionCodes: ["AU"], // Restrict to Australia
          includedPrimaryTypes: ["street_address", "premise", "subpremise"],
        };

        const { suggestions: results } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
            request
          );

        const placePredictions: PlacePrediction[] = results
          .filter((s) => s.placePrediction)
          .map((s) => ({
            placeId: s.placePrediction!.placeId,
            text: s.placePrediction!.text,
            structuredFormat: (
              s.placePrediction as unknown as {
                structuredFormat?: PlacePrediction["structuredFormat"];
              }
            ).structuredFormat,
          }));

        setSuggestions(placePredictions);
        setShowSuggestions(placePredictions.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoaded]
  );

  // Debounced input handler
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(newValue);
      }, 300);
    },
    [onChange, fetchSuggestions]
  );

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(
    async (prediction: PlacePrediction) => {
      setShowSuggestions(false);
      setIsLoading(true);

      try {
        // Use the new Place class to fetch details
        const place = new google.maps.places.Place({
          id: prediction.placeId,
        });

        await place.fetchFields({
          fields: ["addressComponents", "formattedAddress", "location"],
        });

        const components = place.addressComponents || [];

        // Parse address components
        let streetNumber = "";
        let route = "";
        let unit = "";
        let suburb = "";
        let state = "";
        let postcode = "";
        let country = "Australia";

        for (const component of components) {
          const types = component.types;
          if (types.includes("street_number")) {
            streetNumber = component.longText || "";
          } else if (types.includes("route")) {
            route = component.longText || "";
          } else if (types.includes("subpremise")) {
            unit = component.longText || "";
          } else if (
            types.includes("locality") ||
            types.includes("sublocality")
          ) {
            suburb = component.longText || "";
          } else if (types.includes("administrative_area_level_1")) {
            state = component.shortText || "";
          } else if (types.includes("postal_code")) {
            postcode = component.longText || "";
          } else if (types.includes("country")) {
            country = component.longText || "";
          }
        }

        const street =
          streetNumber && route
            ? `${streetNumber} ${route}`
            : route || streetNumber;

        const addressData: AddressComponents = {
          street,
          unit,
          suburb,
          state,
          postcode,
          country,
          placeId: prediction.placeId,
          formattedAddress: place.formattedAddress || prediction.text.text,
        };

        onChange(street);
        onAddressSelect(addressData);

        // Create a new session token for the next search
        sessionTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();
      } catch (error) {
        console.error("Error fetching place details:", error);
        // Fallback: just use the text
        onChange(prediction.text.text);
      } finally {
        setIsLoading(false);
      }
    },
    [onChange, onAddressSelect]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            handleSelectSuggestion(suggestions[selectedIndex]);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [showSuggestions, suggestions, selectedIndex, handleSelectSuggestion]
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className='relative'>
      <div className='relative'>
        <MapPin className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled || !isLoaded}
          className={cn("pl-10", className)}
          autoComplete='off'
        />
        {isLoading && (
          <Loader2 className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground' />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className='absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden'>
          <ul className='py-1'>
            {suggestions.map((prediction, index) => (
              <li key={prediction.placeId}>
                <button
                  type='button'
                  onClick={() => handleSelectSuggestion(prediction)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                    index === selectedIndex && "bg-accent"
                  )}
                >
                  {prediction.structuredFormat ? (
                    <div>
                      <div className='font-medium'>
                        {prediction.structuredFormat.mainText.text}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {prediction.structuredFormat.secondaryText.text}
                      </div>
                    </div>
                  ) : (
                    <div>{prediction.text.text}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className='px-3 py-2 border-t bg-muted/50'>
            <img
              src='https://developers.google.com/static/maps/documentation/images/powered_by_google_on_white.png'
              alt='Powered by Google'
              className='h-4 dark:invert'
            />
          </div>
        </div>
      )}
    </div>
  );
}
