'use client';

import { useState, useMemo, useEffect, memo } from "react";
import { Filter as FilterIcon, Search, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  useCategories,
  useSubcategoriesByCategory,
  useCategoryMutations,
} from "@/hooks/useCategories";


// Define proper TypeScript interfaces
interface PriceRange {
  min: number;
  max: number;
}

interface Filters {
  categories: number[];
  subcategories: number[];
  conditions: string[];
  priceRange: PriceRange;
  maxDistance: number;
  searchQuery: string;
}

interface ListingsFilterProps {
  filters: Filters;
  updateFilters: (filters: Partial<Filters>) => void;
  clearFilters: () => void;
}

const NO_MAX_PRICE = 1000000;

export const ListingsFilter = memo(
  ({ filters, updateFilters, clearFilters }: ListingsFilterProps) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [searchInput, setSearchInput] = useState("");

    // Use the category hooks
    const {
      data: categories = [],
      isLoading: categoriesLoading,
      error: categoriesError,
      refetch: refetchCategories,
    } = useCategories();

    const selectedCategoryId = useMemo(
      () => (filters.categories.length === 1 ? filters.categories[0] : null),
      [filters.categories],
    );

    const {
      data: filteredSubcategories = [],
      isLoading: subcategoriesLoading,
      error: subcategoriesError,
    } = useSubcategoriesByCategory(selectedCategoryId);

    const { prefetchCategories, prefetchSubcategories } =
      useCategoryMutations();

    // Initialize search input with current search query
    useEffect(() => {
      setSearchInput(filters.searchQuery);
    }, [filters.searchQuery]);

    // Prefetch categories and subcategories on component mount for better UX
    useEffect(() => {
      prefetchCategories();
      prefetchSubcategories();
    }, [prefetchCategories, prefetchSubcategories]);

    const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      updateFilters({ searchQuery: searchInput.trim() });
    };

    const handleCategoryChange = (categoryId: number, checked: boolean) => {
      if (checked) {
        updateFilters({
          categories: [categoryId],
          subcategories: [], // Clear subcategories when changing category
        });
      } else {
        updateFilters({
          categories: [],
          subcategories: [],
        });
      }
    };

    const handleSubcategoryChange = (
      subcategoryId: number,
      checked: boolean,
    ) => {
      if (checked) {
        updateFilters({ subcategories: [subcategoryId] });
      } else {
        updateFilters({ subcategories: [] });
      }
    };

    const handleConditionChange = (condition: string, checked: boolean) => {
      const newConditions = checked
        ? [...filters.conditions, condition]
        : filters.conditions.filter((c) => c !== condition);
      updateFilters({ conditions: newConditions });
    };

    const handlePriceChange = (field: "min" | "max", value: string) => {
      const numericValue = Number(value) || 0;
      updateFilters({
        priceRange: {
          ...filters.priceRange,
          [field]:
    field === "max" && numericValue === 0 ? NO_MAX_PRICE : numericValue,
        },
      });
    };

    const handleDistanceChange = (newDistance: number[]) => {
      updateFilters({ maxDistance: newDistance[0] });
    };

    const clearSearchQuery = () => {
      setSearchInput("");
      updateFilters({ searchQuery: "" });
    };

    const hasActiveFilters = useMemo(
      () =>
        filters.categories.length > 0 ||
        filters.subcategories.length > 0 ||
        filters.conditions.length > 0 ||
        filters.priceRange.min > 0 ||
        filters.priceRange.max < NO_MAX_PRICE ||
        filters.maxDistance !== 50 ||
        filters.searchQuery.trim() !== "",
      [filters],
    );

    const renderCategoriesSection = (isMobile: boolean) => {
      if (categoriesError) {
        return (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex justify-between items-center">
              Failed to load categories
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchCategories()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        );
      }

      if (categoriesLoading) {
        return (
          <div className="space-y-2 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded flex-1" />
              </div>
            ))}
          </div>
        );
      }

      return (
        <div className="space-y-2 pt-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`${isMobile ? "mobile-" : ""}category-${category.id}`}
                checked={filters.categories.includes(category.id)}
                onCheckedChange={(checked) =>
                  handleCategoryChange(category.id, !!checked)
                }
              />
              <label
                htmlFor={`${isMobile ? "mobile-" : ""}category-${category.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
              >
                {category.name}
              </label>
            </div>
          ))}
        </div>
      );
    };

    const renderSubcategoriesSection = (isMobile: boolean) => {
      if (subcategoriesError) {
        return (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex justify-between items-center">
              Failed to load subcategories
              <Button
                variant="outline"
                size="sm"
                onClick={() => prefetchSubcategories()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        );
      }

      if (subcategoriesLoading) {
        return (
          <div className="space-y-2 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded flex-1" />
              </div>
            ))}
          </div>
        );
      }

      return (
        <div className="space-y-2 pt-2">
          {filteredSubcategories.map((subcategory) => (
            <div key={subcategory.id} className="flex items-center space-x-2">
              <Checkbox
                id={`${isMobile ? "mobile-" : ""}subcategory-${subcategory.id}`}
                checked={filters.subcategories.includes(subcategory.id)}
                onCheckedChange={(checked) =>
                  handleSubcategoryChange(subcategory.id, !!checked)
                }
              />
              <label
                htmlFor={`${isMobile ? "mobile-" : ""}subcategory-${subcategory.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
              >
                {subcategory.name}
              </label>
            </div>
          ))}
        </div>
      );
    };

    const renderFilterOptions = (isMobile: boolean) => (
      <>
        {/* Search Bar */}
        <div className="mb-6">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search listings..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchInput && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={clearSearchQuery}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button type="submit" className="w-full mt-2">
              Search
            </Button>
          </form>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="mb-4">
            <Button
              onClick={clearFilters}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Clear All Filters
            </Button>
          </div>
        )}

        <Accordion
          type="multiple"
          defaultValue={["categories", "price", "condition"]}
          className="w-full"
        >
          <AccordionItem value="categories">
            <AccordionTrigger>Categories</AccordionTrigger>
            <AccordionContent>
              {renderCategoriesSection(isMobile)}
            </AccordionContent>
          </AccordionItem>

          {/* Subcategories - only show when exactly one category is selected */}
          {filters.categories.length === 1 && (
            <AccordionItem value="subcategories">
              <AccordionTrigger>
                Subcategories
                {filteredSubcategories.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({filteredSubcategories.length})
                  </span>
                )}
              </AccordionTrigger>
              <AccordionContent>
                {renderSubcategoriesSection(isMobile)}
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="price">
            <AccordionTrigger>Price Range</AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.priceRange.min || ""}
                  onChange={(e) => handlePriceChange("min", e.target.value)}
                  className="w-full"
                  min="0"
                />
                <span>to</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={
                    filters.priceRange.max === NO_MAX_PRICE
                      ? ""
                      : filters.priceRange.max
                  }
                  onChange={(e) => handlePriceChange("max", e.target.value)}
                  className="w-full"
                  min="0"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="distance">
            <AccordionTrigger>Max Distance (km)</AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="space-y-4">
                <Slider
                  min={1}
                  max={100}
                  step={1}
                  value={[filters.maxDistance]}
                  onValueChange={handleDistanceChange}
                  className="w-full"
                />
                <div className="flex items-center justify-center text-sm">
                  <span>{filters.maxDistance} km</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="condition">
            <AccordionTrigger>Condition</AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="space-y-2">
                {["new", "used", "refurbished"].map((condition) => (
                  <div key={condition} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${isMobile ? "mobile-" : ""}condition-${condition}`}
                      checked={filters.conditions.includes(condition)}
                      onCheckedChange={(checked) =>
                        handleConditionChange(condition, !!checked)
                      }
                    />
                    <label
                      htmlFor={`${isMobile ? "mobile-" : ""}condition-${condition}`}
                      className="text-sm capitalize cursor-pointer"
                    >
                      {condition}
                    </label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </>
    );

    return (
      <>
        {/* Desktop Filter */}
        <div className="hidden md:block w-64 space-y-6">
          <h3 className="font-semibold text-lg">Filters</h3>
          {renderFilterOptions(false)}
        </div>

        {/* Mobile Filter */}
        <div className="md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full relative">
                <FilterIcon className="mr-2 h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="py-4">{renderFilterOptions(true)}</div>
            </SheetContent>
          </Sheet>
        </div>
      </>
    );
  },
);

ListingsFilter.displayName = "ListingsFilter";