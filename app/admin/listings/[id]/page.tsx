
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Listing } from "@/lib/types/listing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import ListingModerationActions from "@/components/admin/listing-actions";

export default function ListingPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListingDetails = async () => {
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from("listings")
          .select("*, profiles!inner(*)")
          .eq("id", params.id)
          .single();

        if (error) throw error;
        setListing(data as Listing);
      } catch (error: any) {
        if (error.code === 'PGRST116') {
          setError('Listing not found');
        } else {
          console.error("Failed to fetch listing details", error);
          setError(error.message || "Failed to fetch listing details");
        }
      }
    };

    if (params.id) {
      fetchListingDetails();
    }
  }, [params.id]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable ||
      target.getAttribute("contenteditable") === "true"
    ) {
      return; // Don't trigger shortcuts when typing in form elements
    }

    if (event.key.toLowerCase() === "a") {
      document.getElementById("approve-button")?.click();
    }
    if (event.key.toLowerCase() === "r") {
      document.getElementById("reject-button")?.click();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!listing) {
    return <div>Loading listing details...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Listing Preview</h1>
      <p className="text-muted-foreground mb-6">
        Review the listing details and media below. Press [A] to Approve or [R]
        to Reject.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{listing.title}</CardTitle>
              <div className="flex items-center gap-4 pt-2">
                <Badge variant="secondary">{listing.condition}</Badge>
                <span className="text-2xl font-bold text-green-600">
                  Ksh {formatPrice(listing.price)}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {listing.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media Gallery</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {listing.images?.map((img, index) => (
                <div
                  key={index}
                  className="aspect-square bg-muted rounded-lg overflow-hidden"
                >
                  <Image
                    src={img}
                    alt={`Listing image ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
              )) || (
                <p className="text-muted-foreground">No images provided.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Moderation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Current Status:</span>
                  <Badge
                    className={`capitalize ${listing.status === "approved" ? "bg-green-100 text-green-800" : listing.status === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                    {listing.status || "pending"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Author:</span>
                  <span>
                    {listing.profiles?.full_name || listing.profiles?.email}
                  </span>
                </div>
              </div>
              <ListingModerationActions listing={listing} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
