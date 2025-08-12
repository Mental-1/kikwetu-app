import { NextResponse } from 'next/server';
import { z } from 'zod';
import { toggleLikeListing } from '@/app/actions/user';

const likeSchema = z.object({
  listingId: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();

  const parseResult = likeSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.format() },
      { status: 400 }
    );
  }

  try {
    const result = await toggleLikeListing(parseResult.data.listingId);
    return NextResponse.json({ success: true, liked: result.liked });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}