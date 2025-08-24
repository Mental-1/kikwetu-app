"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/utils/supabase/client";
import { listingSchema } from "@/lib/validations";

// Create a specific schema for editing with only the fields we need
const editListingSchema = listingSchema.pick({
  title: true,
  description: true,
  price: true,
}).extend({
  condition: z.enum(["new", "used", "refurbished"]),
});

type ListingFormData = z.infer<typeof editListingSchema>;

function EditListingForm({
  listing,
  listingId,
}: {
  listing: ListingFormData;
  listingId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormData>({
    resolver: zodResolver(editListingSchema),
    defaultValues: {
      ...listing,
      price: Number(listing.price),
    } as ListingFormData,
  });

  const onSubmit: SubmitHandler<ListingFormData> = async (formData) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update a listing.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("listings")
      .update({ ...formData, status: "pending" })
      .eq("id", listingId)
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: `Failed to update listing: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Listing updated and submitted for review.",
      });
      router.push("/dashboard/listings");
      router.refresh();
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Your Listing</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title
            </label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium mb-1"
            >
              Description
            </label>
            <Textarea id="description" {...register("description")} rows={6} />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium mb-1">
              Price
            </label>
            <Input
              id="price"
              type="number"
              {...register("price", { valueAsNumber: true })}
            />
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">
                {errors.price.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="condition"
              className="block text-sm font-medium mb-1"
            >
              Condition
            </label>
            <Controller
              name="condition"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="refurbished">Refurbished</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.condition && (
              <p className="text-red-500 text-sm mt-1">
                {errors.condition.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : "Save Changes & Submit for Review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [listing, setListing] = useState<ListingFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = getSupabaseClient();
  const listingId = params.id as string;

  useEffect(() => {
    if (!listingId) {
      setIsLoading(false);
      return;
    }

    const fetchListing = async () => {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to edit a listing.",
          variant: "destructive",
        });
        router.push("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select("title, description, price, condition, user_id")
        .eq("id", listingId)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        toast({
          title: "Error",
          description:
            "Listing not found or you don&apos;t have permission to edit it.",
          variant: "destructive",
        });
        router.push("/dashboard/listings");
      } else {
        const validation = editListingSchema.safeParse(data);
        if (validation.success) {
          setListing(validation.data);
        } else {
          toast({
            title: "Data Error",
            description: `The listing data is invalid. ${validation.error.message}`,
            variant: "destructive",
          });
          router.push("/dashboard/listings");
        }
      }
      setIsLoading(false);
    };

    fetchListing();
  }, [listingId, router, toast, supabase]);

  if (isLoading) {
    return <div className="container mx-auto py-10">Loading...</div>;
  }

  if (!listing) {
    return (
      <div className="container mx-auto py-10">Could not load listing.</div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <EditListingForm listing={listing} listingId={listingId} />
    </div>
  );
}
