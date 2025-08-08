"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/useCategories"; // Import the new hook
import { CategoriesSkeleton } from "./categories-skeleton"; // Assuming this is for loading state
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface CategoryWithIcon {
  id: number;
  name: string;
  icon?: string;
}

const fallbackCategories: CategoryWithIcon[] = [
  { id: 1, name: "Automobiles", icon: "🚗" },
  { id: 2, name: "Property", icon: "🏠" },
  { id: 3, name: "Phones & Tablets", icon: "📱" },
  { id: 4, name: "Electronics", icon: "💻" },
  { id: 5, name: "House Appliances", icon: "🧹" },
  { id: 6, name: "Furniture", icon: "🪑" },
  { id: 7, name: "Health", icon: "💊" },
  { id: 8, name: "Beauty", icon: "💄" },
  { id: 9, name: "Fashion", icon: "👗" },
  { id: 10, name: "Sports", icon: "⚽" },
  { id: 11, name: "Books", icon: "📚" },
  { id: 12, name: "Music", icon: "🎵" },
  { id: 13, name: "Games", icon: "🎮" },
  { id: 14, name: "Toys", icon: "🧸" },
  { id: 15, name: "Baby Items", icon: "🍼" },
  { id: 16, name: "Pets", icon: "🐕" },
  { id: 17, name: "Garden", icon: "🌱" },
  { id: 18, name: "Tools", icon: "🔧" },
  { id: 19, name: "Art", icon: "🎨" },
  { id: 20, name: "Jewelry", icon: "💎" },
  { id: 21, name: "Food", icon: "🍕" },
  { id: 22, name: "Services", icon: "🛠️" },
  { id: 23, name: "Jobs", icon: "💼" },
];

/**
 * Renders a section displaying a grid of category cards, fetching category data using the useCategories hook.
 *
 * Shows a loading skeleton while fetching data. Each card links to a filtered listings page for the selected category.
 */
export default function CategoriesSection() {
  const { data: categories, isLoading, error, refetch } = useCategories();

  // Determine which categories to display, ensuring it's always an array of CategoryWithIcon
  const categoriesToDisplay: CategoryWithIcon[] =
    error && !categories?.length ? fallbackCategories : categories || [];

  if (isLoading) {
    return <CategoriesSkeleton />;
  }

  return (
    <section aria-labelledby="categories-heading">
      <h2 id="categories-heading" className="sr-only">Categories</h2>
      {error && !categories?.length && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex justify-between items-center">
            Failed to load categories from server. Displaying fallback data.
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {categoriesToDisplay.map((category) => (
          <Link key={category.id} href={`/listings?category=${category.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-[3px] border-border bg-muted/50">
              <CardContent className="p-3 text-center">
                <div className="text-2xl mb-1">{category.icon || "📦"}</div>
                <h3 className="text-xs font-medium truncate">
                  {category.name}
                </h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
