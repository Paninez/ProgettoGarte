import React, { useEffect, useRef, useState } from "react";
import { MapPin, Search, ExternalLink, Loader2 } from "lucide-react";

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
  apiKey?: string;
  autoFocus?: boolean;
}

declare global {
  interface Window {
    google: any;
    initGoogleMapsPlacesApi?: () => void;
  }
}

export function AddressAutocompleteInput({
  value,
  onChange,
  placeholder = "Inserisci indirizzo (es. Via Roma 10, Milano)...",
  className = "",
  multiline = false,
  rows = 2,
  apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "",
  autoFocus = false,
}: AddressAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(
    typeof window !== "undefined" && !!window.google?.maps?.places
  );
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Load Google Maps Script if API key is provided and not already loaded
  useEffect(() => {
    if (!apiKey) return;
    if (window.google?.maps?.places) {
      setIsScriptLoaded(true);
      return;
    }

    const scriptId = "google-maps-places-script";
    let existingScript = document.getElementById(scriptId) as HTMLScriptElement;

    if (!existingScript) {
      existingScript = document.createElement("script");
      existingScript.id = scriptId;
      existingScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=it`;
      existingScript.async = true;
      existingScript.defer = true;
      existingScript.onload = () => setIsScriptLoaded(true);
      document.head.appendChild(existingScript);
    } else {
      existingScript.addEventListener("load", () => setIsScriptLoaded(true));
    }
  }, [apiKey]);

  // Attach Places Autocomplete to the input
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || !window.google?.maps?.places) return;

    try {
      // Create Places Autocomplete instance
      const options = {
        types: ["address"],
        componentRestrictions: { country: "it" }, // Default to Italy
        fields: ["formatted_address", "geometry", "name"],
      };

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, options);
      autocompleteRef.current = autocomplete;

      const listener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place && place.formatted_address) {
          onChange(place.formatted_address);
        } else if (place && place.name) {
          onChange(place.name);
        }
      });

      return () => {
        if (window.google?.maps?.event && listener) {
          window.google.maps.event.removeListener(listener);
        }
      };
    } catch (e) {
      console.warn("Google Maps Autocomplete setup notice:", e);
    }
  }, [isScriptLoaded, onChange]);

  // Geolocation helper
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalizzazione non è supportata dal tuo browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        if (isScriptLoaded && window.google?.maps?.Geocoder) {
          try {
            const geocoder = new window.google.maps.Geocoder();
            const latlng = { lat: latitude, lng: longitude };
            geocoder.geocode({ location: latlng }, (results: any[], status: string) => {
              setIsLocating(false);
              if (status === "OK" && results[0]) {
                onChange(results[0].formatted_address);
              } else {
                onChange(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
              }
            });
            return;
          } catch (err) {
            console.error("Geocoding error:", err);
          }
        }
        setIsLocating(false);
        onChange(`Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
      },
      (error) => {
        setIsLocating(false);
        console.warn("Geolocation error:", error);
        alert("Impossibile rilevare la posizione attuale. Autorizza il GPS nel tuo browser.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const mapSearchUrl = value && value.trim() 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.trim())}`
    : null;

  return (
    <div className="space-y-1.5 w-full">
      <div className="relative w-full flex items-center">
        <div className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none">
          <MapPin className="h-4 w-4 text-indigo-500" />
        </div>

        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={`w-full pl-9 pr-20 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-900 ${className}`}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={`w-full pl-9 pr-20 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-900 ${className}`}
          />
        )}

        <div className="absolute right-2 flex items-center gap-1">
          {/* Location button */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            title="Usa la tua posizione GPS attuale"
          >
            {isLocating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Google Maps External link */}
          {mapSearchUrl && (
            <a
              href={mapSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              title="Apri indirizzo su Google Maps"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
        <span className="flex items-center gap-1 font-medium">
          {isScriptLoaded ? (
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Google Maps Autocomplete Attivo
            </span>
          ) : apiKey ? (
            <span className="text-amber-600 font-medium">Caricamento Google Maps...</span>
          ) : (
            <span className="text-slate-400">Suggerimento: puoi digitare l'indirizzo o usare l'icona cerca per la posizione</span>
          )}
        </span>
      </div>
    </div>
  );
}
