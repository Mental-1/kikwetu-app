import { NextRequest, NextResponse } from "next/server";
import { getFilteredListingsAction } from "@/app/actions/search";
import { z } from "zod";

const searchParamsSchema = z.object({
  page: z.preprocess(Number, z.number().min(1)).optional(),
  pageSize: z.preprocess(Number, z.number().min(1)).optional(),
  sortBy: z.string().optional(),
  userLocation: z.object({
    lat: z.preprocess(Number, z.number()),
    lon: z.preprocess(Number, z.number()),
  }).nullable().optional(),
  filters: z.object({
    categories: z.array(z.preprocess(Number, z.number())).optional(),
    subcategories: z.array(z.preprocess(Number, z.number())).optional(),
    conditions: z.array(z.string()).optional(),
    priceRange: z.object({
      min: z.preprocess(Number, z.number()).optional(),
      max: z.preprocess(Number, z.number()).optional(),
    }).optional(),
    maxDistance: z.preprocess(Number, z.number()).optional(),
    searchQuery: z.string().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = searchParamsSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ error: "Invalid request body", details: validatedData.error.flatten() }, { status: 400 });
    }

    const { page, pageSize, sortBy, userLocation, filters } = validatedData.data;

    const result = await getFilteredListingsAction({
      page: page || 1,
      pageSize: pageSize || 20,
      sortBy: sortBy || "newest",
      userLocation: userLocation || null,
      filters: filters || { categories: [], subcategories: [], conditions: [], priceRange: {}, maxDistance: undefined, searchQuery: undefined },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in /api/listings/search:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}