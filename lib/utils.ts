import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) {
    return "N/A";
  }
  return new Intl.NumberFormat('en-US', { useGrouping: true }).format(price);
}

export function getNumericPrice(priceString: string | null | undefined): number | null {
  if (priceString === null || priceString === undefined || priceString.trim() === '') {
    return null;
  }
  // Remove commas and trim whitespace
  const sanitizedPrice = priceString.replace(/,/g, '').trim();
  const price = Number(sanitizedPrice);

  if (isNaN(price)) {
    return null; // Or throw an error, depending on desired behavior
  }
  return price;
}