import { getSettings } from "@/app/settings/actions/settings-actions";

const exchangeRates = {
  USD: 1,
  KES: 130,
  EUR: 0.9,
  GBP: 0.8,
};

export const formatPrice = (price: number, currency: keyof typeof exchangeRates) => {
  const rate = exchangeRates[currency] || exchangeRates.USD;
  const convertedPrice = price * rate;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(convertedPrice);
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

export const formatPriceWithCurrency = async (price: number) => {
  const settings = await getSettings();
  const currency = settings?.preferences?.currency || "USD";
  const rates = await getExchangeRates();

  if (!rates) {
    return formatPrice(price, "USD");
  }

  const rate = rates[currency] || rates.USD;
  const convertedPrice = price * rate;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(convertedPrice);
};