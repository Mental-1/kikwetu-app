import { Review } from "@/lib/types/listing";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";

interface ReviewsSectionProps {
  listingId: string;
  reviews: Review[];
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ listingId, reviews }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newReview, setNewReview] = useState("");
  const [newRating, setNewRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (!newReview.trim() || newRating === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a comment and a rating.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`/api/listings/${listingId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: newRating,
          comment: newReview,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      setNewReview("");
      setNewRating(0);
      queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      toast({
        title: "Success",
        description: "Review submitted successfully!",
      });
    } catch (error: any) {
      console.error("Error submitting review:", error);
      if (error.name === "AbortError") {
        toast({
          title: "Request Timed Out",
          description: "The review submission took too long. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to submit review.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Review Submission Form */}
          <div className="border p-4 rounded-md">
            <h3 className="text-lg font-semibold mb-2">Leave a Review</h3>
            <div className="flex items-center mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  role="button"
                  tabIndex={0}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  className={`cursor-pointer ${newRating >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                  onClick={() => setNewRating(star)}
                  onKeyDown={(e) => e.key === 'Enter' && setNewRating(star)}
                />
              ))}
            </div>
            <Textarea
              placeholder="Write your review here..."
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              className="mb-2"
            />
            <Button onClick={handleSubmitReview} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>

          {/* Existing Reviews */}
          {reviews.length === 0 ? (
            <p>No reviews yet. Be the first to leave one!</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border p-4 rounded-md">
                  <div className="flex items-center mb-2">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage
                        src={review.profiles.avatar_url || "/placeholder-user.jpg"}
                        alt={review.profiles.full_name}
                      />
                      <AvatarFallback>
                        {review.profiles.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{review.profiles.full_name}</p>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${review.rating >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-2">{review.comment}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};