import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.EXCHANGE_RATE_API_KEY;

if (!API_KEY) {
  throw new Error("EXCHANGE_RATE_API_KEY environment variable is required");
}

const API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;

let cachedData: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET(req: NextRequest) {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(cachedData);
    }

    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate response structure
    if (!data.conversion_rates) {
      throw new Error("Invalid response structure from exchange rate API");
    }
    
    // Update cache
    cachedData = data;
    cacheTimestamp = now;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Currency API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}