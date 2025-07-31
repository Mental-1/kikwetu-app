"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Database } from "@/utils/supabase/database.types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

interface FilterSidebarProps {
  categories: Category[];
  initialFilters?: {
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    location?: string;
    distance?: string;
    condition?: string[];
    rating?: string;
  };
  onFilterChangeAction: (filters: any) => void;
  className?: string;
}

/**
 * Displays a sidebar with interactive controls for filtering listings by category, price, location, distance, item condition, and seller rating.
 *
 * Synchronizes filter state with URL query parameters and invokes a callback with the current filter values when filters are applied or reset. Shows active filters and provides options to apply or reset all filters.
 *
 * @param categories - List of category objects to display as filter options
 * @param initialFilters - Optional initial filter values for pre-populating the filter controls
 * @param onFilterChange - Callback invoked with the current filters when filters are applied or reset
 * @param className - Optional CSS class for custom styling
 * @returns The filter sidebar React component
 */
export function FilterSidebar({
  categories,
  initialFilters = {},
  onFilterChangeAction,
  className = "",
}: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialFilters.category || "all",
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([
    initialFilters.minPrice ? Number.parseInt(initialFilters.minPrice) : 0,
    initialFilters.maxPrice
      ? Number.parseInt(initialFilters.maxPrice)
      : 10000000000,
  ]);
  const [location, setLocation] = useState<string>(
    initialFilters.location || "",
  );
  const [distance, setDistance] = useState<number>(
    initialFilters.distance ? Number.parseInt(initialFilters.distance) : 50,
  );
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    initialFilters.condition
      ? typeof initialFilters.condition === "string"
        ? [initialFilters.condition]
        : initialFilters.condition
      : [],
  );
  const [rating, setRating] = useState<number>(
    initialFilters.rating ? Number.parseInt(initialFilters.rating) : 0,
  );
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Conditions options
  const conditions = [
    { id: "new", label: "New" },
    { id: "used", label: "Used" },
    { id: "refurbished", label: "Refurbished" },
  ];

  // Update active filters
  useEffect(() => {
    const filters = [];

    if (selectedCategory !== "all") filters.push("Category");
    if (priceRange[0] > 0 || priceRange[1] < 10000000000) filters.push("Price");
    if (location) filters.push("Location");
    if (distance !== 50) filters.push("Distance");
    if (selectedConditions.length > 0) filters.push("Condition");
    if (rating > 0) filters.push("Rating");

    setActiveFilters(filters);
  }, [
    selectedCategory,
    priceRange,
    location,
    distance,
    selectedConditions,
    rating,
  ]);

  // Apply filters
  const applyFilters = () => {
    const filters = {
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      minPrice: priceRange[0] > 0 ? priceRange[0].toString() : undefined,
      maxPrice: priceRange[1] < 10000000000 ? priceRange[1].toString() : undefined,
      location: location || undefined,
      distance: distance !== 50 ? distance.toString() : undefined,
      condition: selectedConditions.length > 0 ? selectedConditions : undefined,
      rating: rating > 0 ? rating.toString() : undefined,
    };

    onFilterChangeAction(filters);

    // Update URL with filters
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.delete(key);
        value.forEach((v) => params.append(key, v));
      } else {
        params.set(key, value);
      }
    });

    router.push(`/listings?${params.toString()}`);
  };

  // Reset filters
  const resetFilters = () => {
    setSelectedCategory("all");
    setPriceRange([0, 10000000000]);
    setLocation("");
    setDistance(50);
    setSelectedConditions([]);
    setRating(0);

    onFilterChangeAction({});
    router.push("/listings");
  };

  // Get user's current location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // In a real app, we would use a geocoding service to get the address
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        },
        (error) => {
          console.error("Error getting location:", error);
        },
      );
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Reset All
          </Button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge key={filter} variant="secondary">
              {filter}
            </Badge>
          ))}
        </div>
      )}

      <Accordion
        type="multiple"
        defaultValue={["category", "price", "location"]}
      >
        <AccordionItem value="category">
          <AccordionTrigger>Category</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <button
                type="button"
                className={`px-2 py-1 rounded cursor-pointer ${selectedCategory === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setSelectedCategory("all")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedCategory("all");
                  }
                }}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  className={`px-2 py-1 rounded cursor-pointer ${selectedCategory === category.id.toString() ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => setSelectedCategory(category.id.toString())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedCategory(category.id.toString());
                    }
                  }}
                >
                  {category.icon} {category.name}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price">
          <AccordionTrigger>Price Range</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={priceRange[0]}
                  onChange={(e) =>
                    setPriceRange([
                      Number.parseInt(e.target.value) || 0,
                      priceRange[1],
                    ])
                  }
                  className="w-full"
                />
                <span>to</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={priceRange[1]}
                  onChange={(e) =>
                    setPriceRange([
                      priceRange[0],
                      Number.parseInt(e.target.value) || 10000000000,
                    ])
                  }
                  className="w-full"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="location">
          <AccordionTrigger>Location</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter location..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={getUserLocation}>
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Distance: {distance} km</Label>
                </div>
                <Slider
                  value={[distance]}
                  min={1}
                  max={100}
                  step={1}
                  onValueChange={(value) => setDistance(value[0])}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="condition">
          <AccordionTrigger>Condition</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {conditions.map((condition) => (
                <div key={condition.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`condition-${condition.id}`}
                    checked={selectedConditions.includes(condition.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedConditions([
                          ...selectedConditions,
                          condition.id,
                        ]);
                      } else {
                        setSelectedConditions(
                          selectedConditions.filter(
                            (id) => id !== condition.id,
                          ),
                        );
                      }
                    }}
                  />
                  <Label htmlFor={`condition-${condition.id}`}>
                    {condition.label}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="rating">
          <AccordionTrigger>Seller Rating</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Minimum Rating: {rating}+ stars</Label>
              </div>
              <Slider
                value={[rating]}
                min={0}
                max={5}
                step={1}
                onValueChange={(value) => setRating(value[0])}
              />
              <div className="flex justify-between">
                <span>Any</span>
                <span>5 stars</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button className="w-full" onClick={applyFilters}>
        Apply Filters
      </Button>
    </div>
  );
}
