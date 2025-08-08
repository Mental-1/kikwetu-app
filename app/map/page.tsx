'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { MapLayout } from "@/components/map-layout";
import { MapSidebar } from "@/components/map-sidebar";
import { getNearbyListings } from "./actions";
import dynamic from "next/dynamic";
import { MapListing, UserLocation } from "@/lib/types/map";
import { debounce } from "@/utils/debounce";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const MapSkeleton = () => (
  <div className="w-full h-full bg-muted flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Loading map...</p>
    </div>
  </div>
);

const DEFAULT_LOCATION = { lat: -1.2921, lng: 36.8219 }; // Nairobi
const GEOLOCATION_TIMEOUT = 10000; // 10 seconds

export default function MapViewPage() {
  const [listings, setListings] = useState<MapListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<MapListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [distance, setDistance] = useState(5);
  const [debouncedDistance, setDebouncedDistance] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  const [isSidebarLoading, setIsSidebarLoading] = useState(true);
  const [sidebarError, setSidebarError] = useState<string | null>(null);

  const debouncedSetDistance = useRef(debounce(setDebouncedDistance, 500)).current;

  const fetchLocation = useCallback(async () => {
    setIsMapLoading(true);
    setMapError(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation is not supported by your browser."));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: GEOLOCATION_TIMEOUT, // 10 seconds
        });
      });
      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      return { lat: latitude, lng: longitude };
    } catch (err: any) {
      console.error("Error getting location:", err);
      const errorMessage = err.code === 1 
        ? "Location access denied. Please enable location services."
        : err.code === 2 
        ? "Unable to determine your location. Please try again."
        : err.code === 3
        ? "Location request timed out. Please try again."
        : "Could not retrieve your location.";
      setMapError(errorMessage);
      // Default to Nairobi if location fails, so map can still load
      setUserLocation(DEFAULT_LOCATION);
      return null;
    } finally {
      setIsMapLoading(false);
    }
  }, []);

  const INITIAL_FETCH_RADIUS_KM = 5;

const fetchListings = useCallback(async (location: UserLocation) => {
    setIsSidebarLoading(true);
    setSidebarError(null);
    try {
      const nearby = await getNearbyListings(location.lat, location.lng, INITIAL_FETCH_RADIUS_KM);
      setListings(nearby);
    } catch (err: any) {
      console.error("Error fetching listings:", err);
      setSidebarError("Failed to load nearby listings.");
    } finally {
      setIsSidebarLoading(false);
    }
  }, []);

  const loadMapData = useCallback(async () => {
    const location = await fetchLocation();
    if (location) {
      await fetchListings(location);
    }
  }, [fetchLocation, fetchListings]);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  useEffect(() => {
    debouncedSetDistance(distance);
  }, [distance, debouncedSetDistance]);

  useEffect(() => {
    const filtered = listings
      .filter((l) => l.distance_km <= debouncedDistance)
      .filter((l) => l.title.toLowerCase().includes(searchQuery.toLowerCase()));
    setFilteredListings(filtered);
  }, [listings, debouncedDistance, searchQuery]);

  const renderMapContent = () => {
    if (isMapLoading) {
      return <MapSkeleton />;
    }

    if (userLocation) {
      return (
        <div className="relative w-full h-full">
          {mapError && (
            <div
              className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/50"
              role="alert"
              aria-live="assertive"
            >
              <div className="w-3/4 sm:max-w-sm mx-auto p-4 bg-background rounded-lg shadow-md text-center">
                <AlertCircle aria-hidden="true" className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-destructive mb-2">Map Error</h3>
                <p className="text-muted-foreground mb-4">{mapError}</p>
                <Button onClick={loadMapData}>Try Again</Button>
              </div>
            </div>
          )}
          <MapComponent
            userLocation={userLocation}
            listings={filteredListings}
            selectedListingId={selectedListing}
            onMarkerClick={(id) => setSelectedListing(id)}
          />
        </div>
      );
    }
    return null; // Should not be reached
  };

  return (
    <MapLayout
      buttonText="Show Nearby Listings"
      sidebar={({ isOpen, onToggle }) => (
        <MapSidebar
          listings={filteredListings}
          selectedListing={selectedListing}
          onSelectListing={setSelectedListing}
          distance={distance}
          onDistanceChange={setDistance}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isOpen={isOpen}
          onToggle={onToggle}
          isLoading={isSidebarLoading}
          error={sidebarError}
          onRetry={() => userLocation && fetchListings(userLocation)}
        />
      )}
    >
      {renderMapContent()}
    </MapLayout>
  );
}