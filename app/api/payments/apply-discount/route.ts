import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    const supabase = await getSupabaseServer();

    if (!code) {
      return NextResponse.json({ error: 'Discount code is required.' }, { status: 400 });
    }

    // Query the discount_codes table
    const { data: discountCode, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      console.error('Error fetching discount code:', error);
      return NextResponse.json({ error: 'Invalid discount code.' }, { status: 404 });
    }

    if (!discountCode) {
      return NextResponse.json({ error: 'Discount code not found.' }, { status: 404 });
    }

    // Perform validation checks
    if (!discountCode.is_active) {
      return NextResponse.json({ error: 'Discount code is not active.' }, { status: 400 });
    }

    if (discountCode.expires_at && new Date(discountCode.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Discount code has expired.' }, { status: 400 });
    }

    if (discountCode.max_uses !== null && discountCode.use_count >= discountCode.max_uses) {
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
