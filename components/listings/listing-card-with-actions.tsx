import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Eye, Star, Clock, Calendar, TrendingUp, Edit, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Listing } from "@/lib/types/listing";

interface ListingCardWithActionsProps {
  listing: Listing;
  actions: {
    canEdit?: boolean;
    canDelete?: boolean;
    canFeature?: boolean;
    canRenew?: boolean;
    onEdit?: (listingId: string) => void;
    onDelete?: (listingId: string) => void;
    onFeature?: (listingId: string) => void;
    onRenew?: (listingId: string) => void;
    onRequestReReview?: (listingId: string) => Promise<{ success?: string; error?: string }>;
  };
  getTimeRemaining: (createdAt: string) => string;
  toast: any; // Pass toast from parent for now
}

export function ListingCardWithActions({
  listing,
  actions,
  getTimeRemaining,
  toast,
}: ListingCardWithActionsProps) {
  return (
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
          variant={listing.status === "active" ? "default" : "secondary"}
          className="absolute top-2 right-2"
        >
          {listing.status}
        </Badge>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-1">{listing.title}</CardTitle>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-green-600">
            Ksh {formatPrice(listing.price)}
          </span>
          <Badge variant="outline">{listing.condition}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <Eye className="h-4 w-4 mr-1" />
            {listing.views} Impressions
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date(listing.created_at).toLocaleDateString()}
          </div>
        </div>

        {actions.canEdit && (
          <div className="flex items-center text-sm text-orange-600">
            <Clock className="h-4 w-4 mr-1" />
            {getTimeRemaining(listing.created_at)}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link href={`/listings/${listing.id}`}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Link>
          </Button>

          {actions.canEdit && actions.onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.onEdit!(listing.id)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}

          {listing.status === 'rejected' && actions.onRequestReReview && (
            <form action={async () => {
              const result = await actions.onRequestReReview!(listing.id);
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
            }}>
              <Button variant="outline" size="sm" className="w-full">
                Request Re-review
              </Button>
            </form>
          )}

          {actions.canDelete && actions.onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Listing</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{listing.title}&quot;?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => actions.onDelete!(listing.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {actions.canRenew && actions.onRenew && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.onRenew!(listing.id)}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Renew
            </Button>
          )}
        </div>

        {actions.canFeature && actions.onFeature && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => actions.onFeature!(listing.id)}
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
  );
}
