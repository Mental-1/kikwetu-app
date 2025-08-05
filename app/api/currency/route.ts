import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.EXCHANGE_RATE_API_KEY;

if (!API_KEY) {
  throw new Error("EXCHANGE_RATE_API_KEY environment variable is required");
}

const API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;

import { unstable_cache } from 'next/cache';

const getCachedExchangeRates = unstable_cache(
  async () => {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }
    const data = await response.json();
    if (!data.conversion_rates) {
      throw new Error("Invalid response structure from exchange rate API");
    }
    return data;
  },
  ['exchange-rates'],
  { revalidate: 3600 } // Revalidate every hour
);

export async function GET(req: NextRequest) {
  try {
    const data = await getCachedExchangeRates();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Currency API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}