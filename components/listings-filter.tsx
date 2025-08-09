"use client";

import { useState, useMemo, useEffect, memo, useCallback, useRef } from "react";
import { Filter as FilterIcon, Search, X, AlertCircle } from "lucide-react";
import { debounce } from "lodash";
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
const DEBOUNCE_DELAY = 300; // 300ms debounce for optimal UX

export const ListingsFilter = memo(
  ({ filters, updateFilters, clearFilters }: ListingsFilterProps) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [priceInputs, setPriceInputs] = useState({
      min: filters.priceRange.min || "",
      max:
        filters.priceRange.max === NO_MAX_PRICE
          ? ""
          : filters.priceRange.max || "",
    });

    // Use refs to maintain debounced function instances
    const debouncedSearchRef = useRef<ReturnType<typeof debounce> | null>(null);
    const debouncedPriceRef = useRef<ReturnType<typeof debounce> | null>(null);

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

    // Memoized condition options to prevent unnecessary re-renders
    const conditionOptions = useMemo(() => ["new", "used", "refurbished"], []);

    // Create debounced functions with useCallback to prevent recreation
    const debouncedSearchUpdate = useCallback(
      debounce((query: string) => {
        updateFilters({ searchQuery: query.trim() });
      }, DEBOUNCE_DELAY),
      [updateFilters],
    );

    const debouncedPriceUpdate = useCallback(
      debounce((priceRange: PriceRange) => {
        updateFilters({ priceRange });
      }, DEBOUNCE_DELAY),
      [updateFilters],
    );

    // Store debounced functions in refs to avoid cleanup issues
    useEffect(() => {
      debouncedSearchRef.current = debouncedSearchUpdate;
      debouncedPriceRef.current = debouncedPriceUpdate;

      return () => {
        debouncedSearchRef.current?.cancel();
        debouncedPriceRef.current?.cancel();
      };
    }, [debouncedSearchUpdate, debouncedPriceUpdate]);

    // Initialize search input with current search query
    useEffect(() => {
      setSearchInput(filters.searchQuery);
    }, [filters.searchQuery]);

    // Update price inputs when filters change externally
    useEffect(() => {
      setPriceInputs({
        min: filters.priceRange.min || "",
        max:
          filters.priceRange.max === NO_MAX_PRICE
            ? ""
            : filters.priceRange.max || "",
      });
    }, [filters.priceRange]);

    // Prefetch categories and subcategories on component mount for better UX
    useEffect(() => {
      prefetchCategories();
      prefetchSubcategories();
    }, [prefetchCategories, prefetchSubcategories]);

    const handleSearchChange = useCallback((value: string) => {
      setSearchInput(value);
      debouncedSearchRef.current?.(value);
    }, []);

    const handleSearchSubmit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        // Cancel debounced call and update immediately
        debouncedSearchRef.current?.cancel();
        updateFilters({ searchQuery: searchInput.trim() });
      },
      [searchInput, updateFilters],
    );

    const handleCategoryChange = useCallback(
      (categoryId: number, checked: boolean) => {
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
      },
      [updateFilters],
    );

    const handleSubcategoryChange = useCallback(
      (subcategoryId: number, checked: boolean) => {
        if (checked) {
          updateFilters({ subcategories: [subcategoryId] });
        } else {
          updateFilters({ subcategories: [] });
        }
      },
      [updateFilters],
    );

    const handleConditionChange = useCallback(
      (condition: string, checked: boolean) => {
        const newConditions = checked
          ? [...filters.conditions, condition]
          : filters.conditions.filter((c) => c !== condition);
        updateFilters({ conditions: newConditions });
      },
      [filters.conditions, updateFilters],
    );

    const handlePriceInputChange = useCallback(
      (field: "min" | "max", value: string) => {
        // Allow empty string or valid numbers
        if (value === "" || /^\d*\.?\d*$/.test(value)) {
          const newInputs = { ...priceInputs, [field]: value };
          setPriceInputs(newInputs);

          // Convert to numbers for the filter update
          const minValue = Number(newInputs.min) || 0;
          const maxValue =
            newInputs.max === "" ? NO_MAX_PRICE : Number(newInputs.max) || 0;

          const newPriceRange = {
            min: minValue,
            max: field === "max" && maxValue === 0 ? NO_MAX_PRICE : maxValue,
          };

          debouncedPriceRef.current?.(newPriceRange);
        }
      },
      [priceInputs],
    );

    const handleDistanceChange = useCallback(
      (newDistance: number[]) => {
        updateFilters({ maxDistance: newDistance[0] });
      },
      [updateFilters],
    );

    const clearSearchQuery = useCallback(() => {
      setSearchInput("");
      debouncedSearchRef.current?.cancel();
      updateFilters({ searchQuery: "" });
    }, [updateFilters]);

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

    const renderCategoriesSection = useCallback(
      (isMobile: boolean) => {
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
      },
      [
        categories,
        categoriesLoading,
        categoriesError,
        filters.categories,
        handleCategoryChange,
        refetchCategories,
      ],
    );

    const renderSubcategoriesSection = useCallback(
      (isMobile: boolean) => {
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
      },
      [
        filteredSubcategories,
        subcategoriesLoading,
        subcategoriesError,
        filters.subcategories,
        handleSubcategoryChange,
        prefetchSubcategories,
      ],
    );

    const renderFilterOptions = useCallback(
      (isMobile: boolean) => (
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
                  onChange={(e) => handleSearchChange(e.target.value)}
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*\.?[0-9]*"
                    placeholder="Min"
                    value={priceInputs.min}
                    onChange={(e) =>
                      handlePriceInputChange("min", e.target.value)
                    }
                    className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*\.?[0-9]*"
                    placeholder="Max"
                    value={priceInputs.max}
                    onChange={(e) =>
                      handlePriceInputChange("max", e.target.value)
                    }
                    className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  {conditionOptions.map((condition) => (
                    <div
                      key={condition}
                      className="flex items-center space-x-2"
                    >
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
      ),
      [
        hasActiveFilters,
        clearFilters,
        searchInput,
        handleSearchChange,
        handleSearchSubmit,
        clearSearchQuery,
        renderCategoriesSection,
        filters.categories.length,
        filteredSubcategories.length,
        renderSubcategoriesSection,
        priceInputs,
        handlePriceInputChange,
        filters.maxDistance,
        handleDistanceChange,
        conditionOptions,
        filters.conditions,
        handleConditionChange,
      ],
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
