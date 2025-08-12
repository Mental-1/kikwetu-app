import { NextResponse } from 'next/server';
import { unfollowUser } from '@/app/actions/user';

export async function POST(request: Request) {
  const { userIdToUnfollow } = await request.json();

  try {
    await unfollowUser(userIdToUnfollow);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}