import { NextResponse } from 'next/server';
import { z } from 'zod';
import { followUser } from '@/app/actions/user';

const followSchema = z.object({
  userIdToFollow: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();

  const parseResult = followSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.format() },
      { status: 400 }
    );
  }

  try {
    await followUser(parseResult.data.userIdToFollow);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}