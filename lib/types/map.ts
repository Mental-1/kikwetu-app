export interface MapListing {
  id: number;
  title: string;
  price: number;
  image_url: string;
  distance_km: number;
  lat: number;
  lng: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
}