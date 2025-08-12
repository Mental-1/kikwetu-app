import { NextResponse } from 'next/server';
import { z } from 'zod';
import { unfollowUser } from '@/app/actions/user';

const unfollowSchema = z.object({
  userIdToUnfollow: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();

  const parseResult = unfollowSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.format() },
      { status: 400 }
    );
  }

  try {
    await unfollowUser(parseResult.data.userIdToUnfollow);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}