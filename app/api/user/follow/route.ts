import { NextResponse } from 'next/server';
import { followUser } from '@/app/actions/user';

export async function POST(request: Request) {
  const { userIdToFollow } = await request.json();

  try {
    await followUser(userIdToFollow);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}