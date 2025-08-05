'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { MapLayout } from "@/components/map-layout";
import { MapSidebar } from "@/components/map-sidebar";
import { getNearbyListings } from "./actions";
import dynamic from "next/dynamic";
import { MapListing, UserLocation } from "@/lib/types/map";
import { debounce } from "@/utils/debounce";
import { Button } from "@/components/ui/button";

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
          timeout: 10000, // 10 seconds
        });
      });
      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      return { lat: latitude, lng: longitude };
    } catch (err: any) {
      console.error("Error getting location:", err);
      setMapError(err.message || "Could not retrieve your location.");
      // Default to Nairobi if location fails, so map can still load
      setUserLocation({ lat: -1.2921, lng: 36.8219 });
      return null;
    } finally {
      setIsMapLoading(false);
    }
  }, []);

  const fetchListings = useCallback(async (location: UserLocation) => {
    setIsSidebarLoading(true);
    setSidebarError(null);
    try {
      const nearby = await getNearbyListings(location.lat, location.lng, 25); // Fetch initial 25km
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

    if (mapError) {
      return (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <div className="text-center p-4 bg-background rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-destructive mb-2">Map Error</h3>
            <p className="text-muted-foreground mb-4">{mapError}</p>
            <Button onClick={loadMapData}>Try Again</Button>
          </div>
        </div>
      );
    }

    if (userLocation) {
      return (
        <MapComponent
          userLocation={userLocation}
          listings={filteredListings}
          selectedListingId={selectedListing}
          onMarkerClick={(id) => setSelectedListing(id)}
        />
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