"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import { getSupabaseClient } from "@/utils/supabase/client";
import { ChevronLeft, Star, Eye, Calendar, Clock, Edit, Trash2, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListingCardWithActions } from "@/components/listings/listing-card-with-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { requestReReview } from "@/app/dashboard/listings/actions";
import { formatPrice } from "@/lib/utils";

import type { Database } from "@/utils/supabase/database.types";

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  condition: string;
  status: string;
  featured: boolean;
  featured_until?: string;
  images: string[];
  views: number;
  created_at: string;
  updated_at: string;
  expiry_date?: string;
  category: { name: string };
}

/**
 * Renders a page for authenticated users to view, manage, and interact with their listings.
 *
 * Allows users to see their posted items, edit listings within a 45-minute window, delete listings with confirmation, and feature eligible listings based on their subscription plan. Handles authentication, data retrieval, and user feedback through notifications. Redirects unauthenticated users to the authentication page.
 */
export default function UserListingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: isLoading } = useAuthStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [userPlan, setUserPlan] = useState<string>("free");

  const transformListingData = (l: Database["public"]["Tables"]["listings"]["Row"] & {
  category?: { name: string }
}): Listing => ({
    id: l.id,
    title: l.title,
    description: l.description ?? "",
    price: l.price ?? 0,
    location: l.location ?? "",
    condition: l.condition ?? "",
    status: l.status ?? "",
    featured: l.featured ?? false,
    featured_until: l.featured_until ?? undefined,
    images: l.images ?? [],
    views: l.views ?? 0,
    created_at: l.created_at ?? "",
    updated_at: l.updated_at ?? "",
    expiry_date: l.expiry_date ?? undefined,
    category: l.category ?? { name: "" },
  });

  const fetchUserListings = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();

      const { data: listings, error } = await supabase
        .from("listings")
        .select(
          `
          *,
          category:categories(name)
        `,
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching listings:", error);
        toast({
          title: "Error",
          description: "Failed to load your listings",
          variant: "destructive",
        });
      } else {
        setListings((listings || []).map(transformListingData));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }, [user, toast, setListings]);

  const fetchSavedListings = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();

      const { data: saved, error } = await supabase
        .from('saved_listings')
        .select('listings(*, category:categories(name))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching saved listings:", error);
        toast({
          title: "Error",
          description: "Failed to load your saved listings",
          variant: "destructive",
        });
      } else {
        setSavedListings(
          (saved || [])
            .filter(item => item.listings && Array.isArray(item.listings) && item.listings.length > 0)
            .map((item) => transformListingData(item.listings[0])),
        );
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }, [user, toast, setSavedListings]);

  const fetchUserPlan = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();

      const { data: plan } = await supabase
        .from("plans")
        .select("name")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (plan) {
        setUserPlan(plan.name);
      }
    } catch (error) {
      console.error("Error fetching user plan:", error);
    }
  }, [user, setUserPlan]);

  useEffect(() => {
    if (!isLoading && user) {
      fetchUserListings();
      fetchSavedListings();
      fetchUserPlan();
    } else if (!isLoading && !user) {
      router.push("/auth");
    }
  }, [user, isLoading, fetchUserListings, fetchSavedListings, fetchUserPlan, router, toast]);

  const canEdit = (listing: Listing) => {
    const createdAt = new Date(listing.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    return diffMinutes <= 45;
  };

  const canFeature = (listing: Listing) => {
    return (
      (userPlan === "premium" || userPlan === "enterprise") && !listing.featured
    );
  };

  const handleEdit = (listingId: string) => {
    router.push(`/listings/${listingId}/edit`);
  };

  const handleRenew = (listingId: string) => {
    router.push(`/listings/${listingId}/renew`);
  };

  const handleDelete = async (listingId: string) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", listingId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete listing",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Listing deleted successfully",
        });
        fetchUserListings(); // Refresh the list
      }
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast({
        title: "Error",
        description: "Failed to delete listing",
        variant: "destructive",
      });
    }
  };

  const handleFeature = async (listingId: string) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc("feature_listing", {
        listing_uuid: listingId,
        duration_days: 7,
      });

      if (error || !data) {
        toast({
          title: "Error",
          description:
            "Failed to feature listing. Make sure you have a premium plan.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Listing featured successfully for 7 days",
        });
        fetchUserListings(); // Refresh the list
      }
    } catch (error) {
      console.error("Error featuring listing:", error);
      toast({
        title: "Error",
        description: "Failed to feature listing",
        variant: "destructive",
      });
    }
  };

  const getTimeRemaining = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = 45 - (now.getTime() - created.getTime()) / (1000 * 60);

    if (diffMinutes <= 0) return "Edit time expired";

    const hours = Math.floor(diffMinutes / 60);
    const minutes = Math.floor(diffMinutes % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m left to edit`;
    }
    return `${minutes}m left to edit`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your listings.</p>
          <p className="text-muted-foreground">Please wait a moment ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Listings</h1>
          <p className="text-muted-foreground">Manage your posted items</p>
        </div>
      </div>

      <Tabs defaultValue="my-listings">
        <TabsList>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
          <TabsTrigger value="saved-listings">Saved Listings</TabsTrigger>
        </TabsList>
        <TabsContent value="my-listings">
          {listings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by posting your first item
                </p>
                <Button asChild>
                  <Link href="/post-ad">Post Your First Ad</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden">
                  <div className="relative">
                    <Image
                      src={listing.images[0] || "/placeholder.svg"}
                      alt={listing.title}
                      width={400}
                      height={192}
                      className="w-full h-48 object-cover"
                    />
                    {listing.featured && (
                      <Badge className="absolute top-2 left-2 bg-yellow-500">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    <Badge
                      variant={
                        listing.status === "active" ? "default" : "secondary"
                      }
                      className="absolute top-2 right-2"
                    >
                      {listing.status}
                    </Badge>
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1">
                      {listing.title}
                    </CardTitle>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-600">
                        {formatPrice(listing.price)}
                      </span>
                      <Badge variant="outline">{listing.condition}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {listing.views} views
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(listing.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {canEdit(listing) && (
                      <div className="flex items-center text-sm text-orange-600">
                        <Clock className="h-4 w-4 mr-1" />
                        {getTimeRemaining(listing.created_at)}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1"
                      >
                        <Link href={`/listings/${listing.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>

                      {(listing.status === 'pending' || listing.status === 'rejected') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(listing.id)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}

                      {listing.status === 'rejected' && (
                        <form action={async () => {
                          const result = await requestReReview(listing.id);
                          if (result.success) {
                            toast({
                              title: "Success",
                              description: result.success,
                            });
                            fetchUserListings();
                          } else if (result.error) {
                            toast({
                              title: "Error",
                              description: result.error,
                              variant: "destructive",
                            });
                          }
                        }}>
                          <Button variant="outline" size="sm" className="w-full">
                            Request Re-review
                          </Button>
                        </form>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[75%] mx-auto rounded-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{listing.title}&quot;?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(listing.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {listing.expiry_date && new Date(listing.expiry_date) < new Date() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRenew(listing.id)}
                        >
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Renew
                        </Button>
                      )}
                    </div>

                    {canFeature(listing) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFeature(listing.id)}
                        className="w-full"
                      >
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Feature This Listing
                      </Button>
                    )}

                    {listing.featured && listing.featured_until && (
                      <div className="text-sm text-yellow-600 flex items-center">
                        <Star className="h-4 w-4 mr-1" />
                        Featured until{" "}
                        {new Date(listing.featured_until).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="saved-listings">
          {savedListings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">No saved listings yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by browsing listings and saving your favorites
                </p>
                <Button asChild>
                  <Link href="/listings">Browse Listings</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedListings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden">
                  <div className="relative">
                    <Image
                      src={listing.images[0] || "/placeholder.svg"}
                      alt={listing.title}
                      width={400}
                      height={192}
                      className="w-full h-48 object-cover"
                    />
                    {listing.featured && (
                      <Badge className="absolute top-2 left-2 bg-yellow-500">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    <Badge
                      variant={
                        listing.status === "active" ? "default" : "secondary"
                      }
                      className="absolute top-2 right-2"
                    >
                      {listing.status}
                    </Badge>
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1">
                      {listing.title}
                    </CardTitle>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-600">
                        {formatPrice(listing.price)}
                      </span>
                      <Badge variant="outline">{listing.condition}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {listing.views} views
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(listing.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1"
                      >
                        <Link href={`/listings/${listing.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
