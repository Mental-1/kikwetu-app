'use client';

import { reportUser, toggleSaveListing, isListingSaved } from "./actions";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Calendar,
  Eye,
  MessageCircle,
  Phone,
  Shield,
  Navigation,
  ExternalLink,
} from "lucide-react";
import { ListingMediaGallery } from "@/components/listing-media-gallery";
import posthog from "posthog-js";
import { ReviewsSection } from "@/components/listings/ReviewsSection";
import { Listing } from "@/lib/types/listing";
import { formatPriceWithCurrency } from "@/lib/currency-converter";

export function ListingDetailsClient({ listing }: { listing: Listing }) {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [isSaved, setIsSaved] = useState(false);
    const [gettingDirections, setGettingDirections] = useState(false);
  
    useEffect(() => {
      // Increment view count
      fetch(`/api/listings/${listing.id}/view`, { method: "POST" }).catch(
        (error) => console.error("Failed to increment view count:", error)
      );
  
      // Track event with PostHog
      if (typeof window !== "undefined" && posthog && listing) {
        posthog.capture("listing_viewed", {
          listing_id: listing.id,
          listing_title: listing.title,
          listing_category: listing.category.name,
          seller_id: listing.profiles.id,
        });
      }

      if (user) {
        isListingSaved(listing.id, user.id).then(setIsSaved);
      }
    }, [listing, user]);
  
    const getDirections = async () => {
      if (!listing?.latitude || !listing?.longitude) {
        toast({
          title: "Error",
          description: "Listing location not available",
          variant: "destructive",
        });
        return;
      }
  
      setGettingDirections(true);
  
      try {
        if (!navigator.geolocation) {
          throw new Error("Geolocation is not supported by this browser");
        }
  
        if (location.protocol !== "https:" && location.hostname !== "localhost") {
          throw new Error("Geolocation requires HTTPS");
        }
  
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            const options: PositionOptions = {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 600000,
            };
  
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                console.log("Location acquired:", pos.coords);
                resolve(pos);
              },
              (error) => {
                console.error("Geolocation error:", error);
                let errorMessage = "Unknown error acquiring position";
  
                switch (error.code) {
                  case error.PERMISSION_DENIED:
                    errorMessage = "Location access denied by user";
                    break;
                  case error.POSITION_UNAVAILABLE:
                    errorMessage = "Location information unavailable";
                    break;
                  case error.TIMEOUT:
                    errorMessage = "Location request timed out";
                    break;
                }
  
                reject(new Error(errorMessage));
              },
              options,
            );
          },
        );
  
        const { latitude: userLat, longitude: userLng } = position.coords;
  
        const response = await fetch("/api/directions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originLat: userLat,
            originLng: userLng,
            destLat: listing.latitude,
            destLng: listing.longitude,
          }),
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get directions");
        }
  
        const data = await response.json();
  
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const mapsUrl = isIOS ? data.externalUrls.appleMaps : data.externalUrls.googleMaps;
  
        window.open(mapsUrl, "_blank");
  
        toast({
          title: "Directions opened",
          description: `Route opened in ${isIOS ? "Apple Maps" : "Google Maps"}`,
        });
      } catch (error: any) {
        console.error("Error getting directions:", error);
  
        const fallbackUrl = `https://www.google.com/maps/search/${listing.latitude},${listing.longitude}`;
  
        toast({
          title: "Location Error",
          description:
            error.message ||
            "Could not get your location. Opening listing location instead.",
          variant: "destructive",
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(fallbackUrl, "_blank")}
            >
              Open Maps
            </Button>
          ),
        });
      } finally {
        setGettingDirections(false);
      }
    };
  
    const openMapsWithoutLocation = () => {
      if (!listing?.latitude || !listing?.longitude) return;
  
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      let mapsUrl = `https://www.google.com/maps/search/${listing.latitude},${listing.longitude}`;
  
      if (isIOS) {
        mapsUrl = `https://maps.apple.com/?q=${listing.latitude},${listing.longitude}`;
      }
  
      window.open(mapsUrl, "_blank");
  
      toast({
        title: "Location opened",
        description: `Listing location opened in ${isIOS ? "Apple Maps" : "Google Maps"}`,
      });
    };
  
    const handleSave = async () => {
      if (!user) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to save listings.",
          variant: "destructive",
        });
        return;
      }

      const result = await toggleSaveListing(listing.id, user.id);

      if (result.success) {
        setIsSaved(result.saved ?? false);
        toast({
          title: result.saved ? "Saved successfully" : "Removed from saved",
          description: result.saved
            ? "Listing added to your saved items"
            : "Listing removed from your saved items",
        });
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    };
  
    const handleShare = async () => {
      const url = window.location.href;
  
      if (navigator.share) {
        try {
          await navigator.share({
            title: listing?.title,
            text: listing?.description,
            url,
          });
        } catch (error) {
          // User cancelled sharing
        }
      } else {
        try {
          await navigator.clipboard.writeText(url);
          toast({
            title: "Link copied",
            description: "Listing link copied to clipboard",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to copy link",
            variant: "destructive",
          });
        }
      }
    };
  
    const handleSendMessage = async () => {
      try {
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            listingId: listing.id,
            sellerId: listing.profiles.id,
          }),
        });
  
        if (response.ok) {
          const { conversationId } = await response.json();
          router.push(`/dashboard/messages?conversationId=${conversationId}`);
        } else {
          const errorData = await response.json();
          toast({
            title: "Error",
            description: errorData.error || "Failed to start conversation.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Failed to start conversation.",
          variant: "destructive",
        });
      }
    };
  
    return (
      <div className="min-h-screen bg-background">
        <div className="container px-4 py-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to listings
          </Button>
  
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-0">
                  <ListingMediaGallery images={listing.images} />
                </CardContent>
              </Card>
  
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 mb-4 sm:mb-0">
                      <CardTitle className="text-2xl mb-2 break-words">
                        {listing.title}
                      </CardTitle>
                    </div>
                    <div className="flex space-x-2 flex-shrink-0">
                      <Button variant="outline" size="icon" onClick={handleSave}>
                        <Heart
                          className={`h-4 w-4 ${isSaved ? "fill-red-500 text-red-500" : ""}`}
                        />
                      </Button>
                      <Button variant="outline" size="icon" onClick={handleShare}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
  
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-green-600">
                      Ksh {formatPriceWithCurrency(listing.price)}
                    </div>
                    <Badge variant="outline">{listing.condition}</Badge>
                    <Badge variant="secondary">{listing.category.name}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(listing.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      {listing.views} views
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="description" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="description">Description</TabsTrigger>
                      <TabsTrigger value="location">Location</TabsTrigger>
                    </TabsList>
  
                    <TabsContent value="description" className="mt-4">
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {listing.description}
                      </p>
                    </TabsContent>
  
                    <TabsContent value="location" className="mt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Location:</span>
                          <span className="text-muted-foreground">
                            {listing.location}
                          </span>
                        </div>
                        {listing.latitude && listing.longitude && (
                          <div className="space-y-2">
                            <Button
                              onClick={getDirections}
                              disabled={gettingDirections}
                              className="w-full"
                            >
                              <Navigation className="h-4 w-4 mr-2" />
                              {gettingDirections
                                ? "Getting directions..."
                                : "Get Directions"}
                              <ExternalLink className="h-4 w-4 ml-2" />
                            </Button>
                            <Button
                              variant="outline"
                              onClick={openMapsWithoutLocation}
                              className="w-full"
                            >
                              <MapPin className="h-4 w-4 mr-2" />
                              View on Map
                            </Button>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
  
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Seller Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={listing.profiles.avatar_url || "/placeholder.svg"}
                        alt={listing.profiles.full_name}
                      />
                      <AvatarFallback>
                        {listing.profiles.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {listing.profiles.full_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        @{listing.profiles.username}
                      </p>
                    </div>
                  </div>
  
                  <div className="space-y-2">
                    <Button className="w-full" onClick={handleSendMessage}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`tel:${listing.profiles.phone_number}`}
                        className="w-full"
                      >
                        <Button className="w-full">
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                      </a>
                      <a
                        href={`https://wa.me/${listing.profiles.phone_number}`}
                        className="w-full"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button className="w-full bg-green-600 text-white ring-2 ring-green-600 hover:bg-green-700">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          WhatsApp
                        </Button>
                      </a>
                    </div>
                  </div>
  
                  <Button variant="ghost" className="w-full" asChild>
                    <Link href={`/sellers/${listing.profiles.id}`}>
                      View Seller Profile
                    </Link>
                  </Button>
                </CardContent>
              </Card>
  
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Safety Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-1">•</span>
                      <span>Meet in a public place</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-1">•</span>
                      <span>Inspect the item before payment</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-1">•</span>
                      <span>Use secure payment methods</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-1">•</span>
                      <span>Trust your instincts</span>
                    </li>
                  </ul>
                  <Button
                      variant="outline"
                      className="w-full text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        const result = await reportUser(listing.id, listing.profiles.id);
                        if (result.success) {
                          toast({
                            title: "Success",
                            description: result.success,
                          });
                        } else if (result.error) {
                          toast({
                            title: "Error",
                            description: result.error,
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Report Ad
                    </Button>
                </CardContent>
              </Card>
  
              <Card>
                <CardHeader>
                  <CardTitle>Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReviewsSection reviews={listing.reviews || []} listingId={listing.id} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }
