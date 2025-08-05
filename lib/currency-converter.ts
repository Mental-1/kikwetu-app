import { getSettings } from "@/app/settings/actions/settings-actions";

// Fallback exchange rates (USD base) - update periodically
const exchangeRates = {
  USD: 1,
  KES: 130, // Approximate - last updated: [date]
  EUR: 0.9, // Approximate - last updated: [date]  
  GBP: 0.8, // Approximate - last updated: [date]
};

export const formatPrice = (price: number, currency: keyof typeof exchangeRates) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price);
};

export const convertPrice = (price: number, from: keyof typeof exchangeRates, to: keyof typeof exchangeRates) => {
  const fromRate = exchangeRates[from] || exchangeRates.USD;
  const toRate = exchangeRates[to] || exchangeRates.USD;
  const priceInUSD = price / fromRate;
  const convertedPrice = priceInUSD * toRate;
  return convertedPrice;
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 second

export const getExchangeRates = async () => {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch("/api/currency", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
      }
      const data = await response.json();
      return data.conversion_rates;
    } catch (error: any) {
      console.error(`Attempt ${i + 1} failed to fetch exchange rates:`, error.message);
      if (i < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        console.error("Max retries reached. Failed to fetch exchange rates.");
        return null;
      }
    }
  }
  return null; // Should not be reached if MAX_RETRIES > 0
};

export const formatPriceWithCurrency = async (price: number, sourceCurrency: keyof typeof exchangeRates = "KES") => {
  const settings = await getSettings();
  const targetCurrency = settings?.preferences?.currency || "KES"; // Default to KES

  if (sourceCurrency === targetCurrency) {
    return formatPrice(price, targetCurrency); // No conversion needed if currencies are the same
  }

  const liveRates = await getExchangeRates(); // This fetches rates relative to USD

  let convertedPrice = price;

  if (liveRates) {
    // Convert price from sourceCurrency to USD using live rates
    const priceInUSD = price / (liveRates[sourceCurrency] || exchangeRates[sourceCurrency] || 1);
    // Convert price from USD to targetCurrency using live rates
    convertedPrice = priceInUSD * (liveRates[targetCurrency] || exchangeRates[targetCurrency] || 1);
  } else {
    // Fallback to static exchangeRates if live rates are not available
    // Convert price from sourceCurrency to USD using static rates
    const priceInUSD = price / (exchangeRates[sourceCurrency] || 1);
    // Convert price from USD to targetCurrency using static rates
    convertedPrice = priceInUSD * (exchangeRates[targetCurrency] || 1);
  }

  return formatPrice(convertedPrice, targetCurrency);
};