"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { InfoIcon } from "lucide-react"

/**
 * Renders a button with a "Featured" badge that opens a dialog explaining the benefits and acquisition methods of featured listings.
 *
 * The dialog provides information on how to obtain the "Featured" badge through different plans or by upgrading a listing, and describes the advantages of featured status.
 */
export function FeaturedBadgeInfo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
          <Badge className="bg-yellow-500 hover:bg-yellow-600">Featured</Badge>
          <InfoIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Featured Listings</DialogTitle>
          <DialogDescription>
            Featured listings receive premium placement and visibility across the platform.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <h4 className="font-medium">How to get the Featured badge:</h4>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-medium">Premium Plan:</span> Listings posted with our Premium plan automatically
              receive featured status for 7 days.
            </li>
            <li>
              <span className="font-medium">Enterprise Plan:</span> Listings posted with our Enterprise plan
              automatically receive featured status for 30 days.
            </li>
            <li>
              <span className="font-medium">Boost Your Listing:</span> You can upgrade any existing listing to featured
              status from your account dashboard.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            Featured listings appear at the top of search results, receive special highlighting, and are promoted in our
            email newsletters.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
