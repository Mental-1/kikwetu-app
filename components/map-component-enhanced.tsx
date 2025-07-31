"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Enhanced marker icons with fallback
const createMarkerIcon = (color: string) => {
  try {
    return L.icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })
  } catch (error) {
    // Fallback to default Leaflet icon
    return L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })
  }
}

const markerIcon = createMarkerIcon("red")
const userIcon = createMarkerIcon("blue")

interface MapComponentProps {
  userLocation: [number, number]
  listings: {
    id: number
    title: string
    price: number
    lat: number
    lng: number
    distance: string
  }[]
  selectedListing: number | null
}

// Enhanced MapUpdater with better performance
function MapUpdater({
  userLocation,
  selectedListing,
  listings,
}: {
  userLocation: [number, number]
  selectedListing: number | null
  listings: MapComponentProps["listings"]
}) {
  const map = useMap()
  const [hasInitialized, setHasInitialized] = useState(false)

  // Initialize map view once
  useEffect(() => {
    if (userLocation && !hasInitialized) {
      map.setView(userLocation, 14)
      setHasInitialized(true)
    }
  }, [map, userLocation, hasInitialized])

  // Handle selected listing changes
  useEffect(() => {
    if (selectedListing && hasInitialized) {
      const listing = listings.find((l) => l.id === selectedListing)
      if (listing) {
        map.setView([listing.lat, listing.lng], 16, {
          animate: true,
          duration: 0.5,
        })
      }
    }
  }, [selectedListing, listings, map, hasInitialized])

  return null
}

export default function MapComponent({ userLocation, listings, selectedListing }: MapComponentProps) {
  const [mapReady, setMapReady] = useState(false)

  return (
    <MapContainer
      center={userLocation}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      whenReady={() => setMapReady(true)}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User location marker */}
      {mapReady && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-medium">Your location</p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Listing markers */}
      {mapReady &&
        listings.map((listing) => (
          <Marker
            key={`listing-${listing.id}`}
            position={[listing.lat, listing.lng]}
            icon={markerIcon}
            opacity={selectedListing === null || selectedListing === listing.id ? 1 : 0.7}
            zIndexOffset={selectedListing === listing.id ? 1000 : 0}
          >
            <Popup>
              <div className="text-sm min-w-[150px]">
                <p className="font-medium mb-1">{listing.title}</p>
                <p className="font-bold text-green-600 mb-1">${listing.price}</p>
                <p className="text-gray-500 text-xs">{listing.distance}</p>
              </div>
            </Popup>
          </Marker>
        ))}

      <MapUpdater userLocation={userLocation} selectedListing={selectedListing} listings={listings} />
    </MapContainer>
  )
}
