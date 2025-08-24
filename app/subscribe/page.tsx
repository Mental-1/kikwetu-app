
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { PricingTable } from '@/components/pricing-table';

export default async function SubscribePage() {
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth');
  }

  const { data: plans, error } = await supabase.from('plans').select('*');

  if (error) {
    // Handle error, maybe show an error message
    console.error('Error fetching plans:', error);
    return <div>Error loading plans.</div>;
  }

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold text-center mb-8">Choose Your Plan</h1>
      <PricingTable plans={plans || []} userId={session.user.id} />
    </div>
  );
}
