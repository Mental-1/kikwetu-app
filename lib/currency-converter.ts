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

export const getExchangeRates = async () => {
  try {
    const response = await fetch("/api/currency");
    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates");
    }
    const data = await response.json();
    return data.conversion_rates;
  } catch (error) {
    console.error(error);
    return null;
  }
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