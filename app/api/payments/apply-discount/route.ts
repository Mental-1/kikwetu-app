import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/utils/supabase/server';
import { z } from 'zod';
import { generalApiLimiter, getClientIdentifier } from '@/utils/rate-limiting'; // Import rate limiter

export async function POST(request: Request) {
  // Apply rate limiting
  const identifier = getClientIdentifier(request);
  const { allowed, remaining, resetTime } = generalApiLimiter.check(identifier);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': generalApiLimiter.maxRequests.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetTime.toString(),
        },
      }
    );
  }

  try {
    const supabase = await getSupabaseServer();
    const body = await request.json();
    const schema = z.object({ code: z.string().trim().min(1, 'Discount code is required').transform((s) => s.toUpperCase()) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }
    const code = parsed.data.code;

    // Query the discount_codes table
    const { data: discountCode, error } = await supabase
      .from('discount_codes')
      .select('id,type,value,is_active,expires_at,max_uses,use_count')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      console.error('Error fetching discount code:', error);
      return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }

    if (!discountCode) {
      return NextResponse.json({ error: 'Invalid discount code.' }, { status: 404 });
    }

    // Perform validation checks
    if (!discountCode.is_active) {
      return NextResponse.json({ error: 'Discount code is not active.' }, { status: 400 });
    }

    if (discountCode.expires_at && new Date(discountCode.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Discount code has expired.' }, { status: 400 });
    }

    const useCount = discountCode.use_count ?? 0;
    if (discountCode.max_uses !== null && useCount >= discountCode.max_uses) {
      return NextResponse.json({ error: 'Discount code has reached its maximum uses.' }, { status: 400 });
    }

    // Return the discount details
    return NextResponse.json({
      type: discountCode.type,
      value: discountCode.value,
      code_id: discountCode.id, // Return the ID for tracking usage later
    }, { status: 200 });

  } catch (error) {
    console.error('Error in apply-discount API:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
