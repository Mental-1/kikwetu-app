"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MapLayout } from "@/components/map-layout";
import { MapSidebar } from "@/components/map-sidebar";
import { getNearbyListings } from "./actions";
import dynamic from "next/dynamic";

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center">
      Loading map...
    </div>
  ),
});

// TODO: Replace with actual data fetching logic for nearby listings using the postgis API in supabase
const nearbyListings: MapListing[] = [
  {
    id: 1,
    title: "iPhone 13 Pro Max",
    price: 899,
    image_url: "/placeholder.svg?height=80&width=80",
    distance_km: 0.9,
    lat: -1.2921,
    lng: 36.8219,
  },
];

/**
 * Renders a page with a sidebar of nearby item listings and an interactive map centered on the user's location.
 *
 * The sidebar allows users to search and filter listings by distance, select a listing, and toggle its visibility. The map displays the user's current location (or a default location if unavailable) and highlights the selected listing.
 */
import { MapListing, UserLocation } from "@/lib/types/map";
import { debounce } from "@/utils/debounce";

export default function MapViewPage() {
  const [listings, setListings] = useState<MapListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<MapListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [distance, setDistance] = useState(5);
  const [debouncedDistance, setDebouncedDistance] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const handleToggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const debouncedSetDistance = useRef(debounce(setDebouncedDistance, 500)).current;

  useEffect(() => {
    debouncedSetDistance(distance);
  }, [distance, debouncedSetDistance]);

  useEffect(() => {
    const fetchLocationAndListings = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            const nearby = await getNearbyListings(latitude, longitude, 25); // Fetch initial 25km
            setListings(nearby);
          },
          (error) => {
            console.error("Error getting location:", error);
            // Default to Nairobi if location is denied
            setUserLocation({ lat: -1.2921, lng: 36.8219 });
          },
        );
      } else {
        // Default to Nairobi if geolocation not supported
        setUserLocation({ lat: -1.2921, lng: 36.8219 });
      }
    };
    fetchLocationAndListings();
  }, []);

  useEffect(() => {
    const filtered = listings
      .filter((l) => l.distance_km <= debouncedDistance)
      .filter((l) => l.title.toLowerCase().includes(searchQuery.toLowerCase()));
    setFilteredListings(filtered);
  }, [listings, debouncedDistance, searchQuery]);

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
        />
      )}
    >
      {userLocation ? (
        <div className="relative z-0">
          <MapComponent
            userLocation={userLocation}
            listings={filteredListings}
            selectedListingId={selectedListing}
            onMarkerClick={(id) => setSelectedListing(id)}
          />
        </div>
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
    </MapLayout>
  );
}
