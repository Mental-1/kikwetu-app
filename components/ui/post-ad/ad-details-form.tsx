"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCategories, useSubcategories } from "@/app/post-ad/hooks/useCategories";
import { AdDetailsFormData } from "@/lib/types/form-types";
import type { Database } from "@/utils/supabase/database.types";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type SubCategory = Database["public"]["Tables"]["subcategories"]["Row"];

interface AdDetailsFormProps {
  initialData?: Partial<AdDetailsFormData>;
  onNextAction: (data: AdDetailsFormData) => void;
}

/**
 * Renders a form for entering advertisement details, including title, description, category, subcategory, price, condition, location, and negotiable status.
 *
 * Handles form state, validation, and user interactions such as category selection, subcategory loading, and geolocation-based location detection. On successful validation, submits the form data to the provided callback.
 *
 * @param initialData - Optional initial values to prefill the form fields
 * @param onNextAction - Callback invoked with validated form data upon successful submission
 */
export function AdDetailsForm({
  initialData = {},
  onNextAction,
}: AdDetailsFormProps) {
  // State management moved to component level
  const [formData, setFormData] = useState<AdDetailsFormData>({
    title: "",
    description: "",
    category: "",
    subcategory: "",
    price: "",
    negotiable: false,
    condition: "",
    location: "",
    latitude: undefined,
    longitude: undefined,
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [manualLocation, setManualLocation] = useState("");
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Prefetch categories and subcategories on mount
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  // Fetch subcategories for the selected category
  const {
    data: subcategories = [],
    isLoading: subcategoriesLoading,
  } = useSubcategories(formData.category ? Number(formData.category) : null);

  const handleChange = (field: keyof AdDetailsFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Clear subcategory when category changes
    if (field === "category") {
      setFormData((prev) => ({ ...prev, subcategory: "" }));
    }
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            location: [position.coords.latitude, position.coords.longitude],
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
          setLocationDialogOpen(false);
        },
        (error) => {
          console.error("Error getting location:", error);
        },
      );
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.description?.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.subcategory && subcategories.length > 0) {
      newErrors.subcategory = "Subcategory is required";
    }

    if (!formData.price) {
      newErrors.price = "Price is required";
    } else if (isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      newErrors.price = "Price must be a valid number";
    }

    if (!formData.condition) {
      newErrors.condition = "Condition is required";
    }

    if (!formData.location) {
      newErrors.location = "Location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onNextAction(formData);
    }
  };

  // Show loading state
  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading categories...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (categoriesError) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <p className="text-red-800">
          Failed to load categories. Please refresh the page and try again.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Enter a descriptive title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
        />
        {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your item in detail"
          rows={4}
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => handleChange("category", value)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category: Category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-red-500">{errors.category}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="subcategory">Subcategory</Label>
          <Select
            value={formData.subcategory}
            onValueChange={(value) => handleChange("subcategory", value)}
            disabled={!formData.category || subcategories.length === 0}
          >
            <SelectTrigger id="subcategory">
              <SelectValue
                placeholder={
                  subcategoriesLoading
                    ? "Loading..."
                    : subcategories.length === 0
                    ? "No subcategories available"
                    : "Select a subcategory"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((subcategory: SubCategory) => (
                <SelectItem
                  key={subcategory.id}
                  value={subcategory.id.toString()}
                >
                  {subcategory.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.subcategory && (
            <p className="text-sm text-red-500">{errors.subcategory}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            placeholder="Enter price"
            value={formData.price}
            onChange={(e) => handleChange("price", e.target.value)}
          />
          {errors.price && (
            <p className="text-sm text-red-500">{errors.price}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="condition">Condition</Label>
          <Select
            value={formData.condition}
            onValueChange={(value) =>
              handleChange("condition", value as AdDetailsFormData["condition"])
            }
          >
            <SelectTrigger id="condition">
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="used">Used</SelectItem>
              <SelectItem value="refurbished">Refurbished</SelectItem>
            </SelectContent>
          </Select>
          {errors.condition && (
            <p className="text-sm text-red-500">{errors.condition}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="location">Location</Label>
        <div>
          <Input
            id="location"
            placeholder="Choose location"
            value={
              Array.isArray(formData.location)
                ? `Lat: ${formData.location[0]}, Lng: ${formData.location[1]}`
                : formData.location || ""
            }
            readOnly
            onClick={() => setLocationDialogOpen(true)}
          />
        </div>
        {errors.location && (
          <p className="text-sm text-red-500">{errors.location}</p>
        )}
      </div>

      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-location">Enter location manually</Label>
              <Input
                id="manual-location"
                ref={manualInputRef}
                placeholder="Enter location"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
              />
              <Button
                type="button"
                className="mt-2"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    location: manualLocation,
                  }));
                  setLocationDialogOpen(false);
                }}
                disabled={!manualLocation.trim()}
              >
                Use this location
              </Button>
            </div>
            <div className="flex items-center justify-center">
              <span className="mx-2 text-gray-400">or</span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={detectLocation}
            >
              <Locate className="mr-2 h-4 w-4" />
              Detect Location Automatically
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="negotiable"
          checked={formData.negotiable}
          onCheckedChange={(checked) => handleChange("negotiable", !!checked)}
        />
        <Label htmlFor="negotiable">Negotiable</Label>
      </div>

      <Button type="submit" className="w-full">
        Next
      </Button>
    </form>
  );
}
