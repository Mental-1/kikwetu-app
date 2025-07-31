import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names and merges Tailwind CSS classes, removing duplicates and resolving conflicts.
 *
 * @returns A single string of merged class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a human-readable relative time string for the given date, such as "2 days ago" or "Just now".
 *
 * If the input is null or undefined, returns "Date not available".
 *
 * @param dateString - The date string to format
 * @returns A relative time string representing how long ago the date was
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "Date not available";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

/**
 * Returns the time portion (hours and minutes) of a date string in the user's locale format.
 *
 * If the input is null or undefined, returns an empty string.
 *
 * @param dateString - The date string to format
 * @returns The formatted time string in "HH:mm" format, or an empty string if input is invalid
 */
export function formatMessageTime(
  dateString: string | null | undefined,
): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Formats a date string into a localized date with year, short month, and day.
 *
 * Returns "Date not available" if the input is null or undefined.
 *
 * @param dateString - The date string to format
 * @returns The formatted date string or "Date not available" if input is missing
 */
export function formatListingDate(
  dateString: string | null | undefined,
): string {
  if (!dateString) return "Date not available";

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Returns a new array with all null and undefined values removed.
 *
 * @returns An array containing only non-null, non-undefined items from the input array.
 */
export function filterNullValues<T>(array: (T | null | undefined)[]): T[] {
  return array.filter((item): item is T => item !== null && item !== undefined);
}

/**
 * Validates whether a string is a properly formatted email address.
 *
 * @param email - The email address to check
 * @returns True if the input is a valid email address; otherwise, false
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^(?!.*\.\.)([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/;
  return emailRegex.test(email);
}

/**
 * Validates whether a string is a valid international phone number.
 *
 * The phone number may start with an optional plus sign and must contain only digits, with a maximum length of 16 digits (excluding spaces).
 *
 * @param phone - The phone number string to validate
 * @returns `true` if the phone number is valid, otherwise `false`
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

/**
 * Checks if a file's MIME type is included in the list of allowed types.
 *
 * @param file - The file to validate
 * @param allowedTypes - Array of permitted MIME type strings
 * @returns True if the file's type is allowed; otherwise, false
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Checks if a file's size is less than or equal to the specified maximum size in megabytes.
 *
 * @param file - The file to validate
 * @param maxSizeInMB - The maximum allowed file size in megabytes
 * @returns `true` if the file size is within the limit, otherwise `false`
 */
export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

/**
 * Formats a byte value as a human-readable file size string with units (Bytes, KB, MB, or GB).
 *
 * @param bytes - The number of bytes to format
 * @returns The formatted file size string with the appropriate unit
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncates a string to a specified maximum length, appending an ellipsis if the string exceeds that length.
 *
 * @param text - The input string to truncate
 * @param maxLength - The maximum allowed length of the returned string before truncation
 * @returns The truncated string with an ellipsis if it was longer than `maxLength`
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Converts a string into a URL-friendly slug by lowercasing, removing special characters, replacing spaces and underscores with hyphens, and trimming leading or trailing hyphens.
 *
 * @param text - The input string to convert
 * @returns The generated slug string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Constructs a URL query string from an object, omitting keys with null, undefined, or empty string values.
 *
 * @param params - An object containing key-value pairs to be converted into search parameters
 * @returns A URL-encoded query string representing the provided parameters
 */
export function buildSearchParams(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
}

/**
 * Parses a location string separated by "|" into an object with optional `city` and `country` properties.
 *
 * @param location - The location string in the format "city|country"
 * @returns An object containing `city` and `country` if available; properties are omitted if missing or empty
 */
export function parseLocation(location: string | null | undefined): {
  city?: string;
  country?: string;
} {
  if (!location) return {};

  const parts = location.split("|").map((part) => part.trim());
  return {
    city: parts[0] || undefined,
    country: parts[1] || undefined,
  };
}

/**
 * Returns a formatted location string combining city and country, or a default message if both are missing.
 *
 * @param city - The city name (optional)
 * @param country - The country name (optional)
 * @returns A string in the format "City, Country", "City", "Country", or "Location not specified"
 */
export function formatLocation(city?: string, country?: string): string {
  if (!city && !country) return "Location not specified";
  if (city && country) return `${city}, ${country}`;
  return city || country || "Location not specified";
}

/**
 * Formats a number as a Kenyan Shilling (KES) currency string.
 *
 * Returns "Price not specified" if the price is null or undefined.
 *
 * @param price - The numeric value to format as currency
 * @returns The formatted KES currency string or a default message if price is not provided
 */
export function formatPrice(
  price: number | null | undefined,
  currency: "KES",
): string {
  if (price === null || price === undefined) return "Price not specified";

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Returns a Tailwind CSS class string representing the color associated with a given status.
 *
 * Maps status values such as "active", "pending", "rejected", etc., to corresponding background and text color classes. Defaults to gray styling for unknown or missing statuses.
 *
 * @param status - The status string to map to a color class
 * @returns A string of Tailwind CSS classes for background and text color
 */
export function getStatusColor(status: string | null | undefined): string {
  switch (status?.toLowerCase()) {
    case "active":
    case "approved":
      return "bg-green-100 text-green-800";
    case "pending":
    case "pending_approval":
      return "bg-yellow-100 text-yellow-800";
    case "inactive":
    case "rejected":
      return "bg-red-100 text-red-800";
    case "draft":
      return "bg-gray-100 text-gray-800";
    case "expired":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Extracts a human-readable error message from an unknown error input.
 *
 * Returns the message property if the input is an Error object, the string itself if the input is a string, or a generic message otherwise.
 *
 * @returns The extracted error message or a default message if unavailable.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

/**
 * Returns a debounced version of the given function that delays its execution until after the specified wait time has elapsed since the last call.
 *
 * @param func - The function to debounce
 * @param wait - The delay in milliseconds
 * @returns A debounced function with the same parameters as `func`
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Provides safe wrappers for localStorage methods that handle client-side checks and errors.
 *
 * Returns an object with `getItem`, `setItem`, and `removeItem` methods that return `null` or `false` if localStorage is unavailable or an error occurs.
 */
export function safeLocalStorage() {
  const isClient = typeof window !== "undefined";

  return {
    getItem: (key: string) => {
      if (!isClient) return null;
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      if (!isClient) return false;
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    removeItem: (key: string) => {
      if (!isClient) return false;
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Groups items in an array into an object keyed by the result of a provided function.
 *
 * @param array - The array of items to group
 * @param keyFn - Function that returns the key for each item
 * @returns An object where each key maps to an array of items sharing that key
 */
export function groupBy<T>(
  array: T[],
  keyFn: (item: T) => string,
): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    },
    {} as Record<string, T[]>,
  );
}

/**
 * Returns a new array containing only the first occurrence of each unique item, determined by the key generated from `keyFn`.
 *
 * @param array - The array to filter for unique items
 * @param keyFn - A function that returns a unique key for each item
 * @returns An array of unique items based on the generated keys
 */
export function uniqueBy<T>(
  array: T[],
  keyFn: (item: T) => string | number,
): T[] {
  const seen = new Set();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Resolves an image URL, returning the fallback if the input path is missing or empty.
 *
 * If the provided path is null, undefined, or an empty string, the fallback URL is returned. If the path begins with "http", it is returned unchanged; otherwise, the original path is returned.
 *
 * @returns The resolved image URL or the fallback if the input is missing or invalid.
 */
export function generateImageUrl(
  path: string | null | undefined,
  fallback: "/placeholder.svg",
): string {
  if (!path) return fallback;
  if (path.startsWith("http")) return path;
  return path;
}

/**
 * Returns the original image URL if provided and not a placeholder.
 *
 * Intended as a placeholder for future integration with image optimization services.
 *
 * @param url - The image URL to process
 * @param width - Optional target width for optimization
 * @param height - Optional target height for optimization
 * @param quality - Optional image quality setting (default is 80)
 * @returns The original image URL, or the placeholder URL if applicable
 */
export function optimizeImageUrl(
  url: string,
  width?: number,
  height?: number,
  quality: number = 80,
): string {
  if (!url || url.includes("placeholder.svg")) return url;

  // This would work with image optimization services like Cloudinary, Vercel, etc.
  // For now, return the original URL
  return url;
}
