import { NextResponse } from 'next/server';
import { toggleLikeListing } from '@/app/actions/user';

export async function POST(request: Request) {
  const { listingId } = await request.json();

  try {
    const result = await toggleLikeListing(listingId);
    return NextResponse.json({ success: true, liked: result.liked });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}