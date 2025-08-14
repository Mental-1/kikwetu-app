"use server";

import { cookies } from "next/headers";

export async function getTwoFaInProgressStatus(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has("2fa_in_progress");
}
