'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/auth-context';
import { getPlans, Plan } from '@/app/post-ad/actions';
import { formatPrice } from '@/lib/utils';

export default function RenewListingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      const fetchedPlans = await getPlans();
      setPlans(fetchedPlans);
      if (fetchedPlans.length > 0) {
        setSelectedPlan(fetchedPlans[0]);
      }
    };
    fetchPlans();
  }, []);

  const handleRenew = async () => {
    if (!user || !selectedPlan) return;

    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('renew_listing', {
      listing_id: params.id,
      plan_id: selectedPlan.id,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to renew listing',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Listing renewed successfully',
      });
      router.push('/dashboard/listings');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Renew Listing</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`cursor-pointer ${selectedPlan?.id === plan.id ? 'border-primary' : ''}`}
            onClick={() => setSelectedPlan(plan)}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatPrice(plan.price)}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 flex justify-end">
        <Button onClick={handleRenew} disabled={!selectedPlan}>
          Renew Listing
        </Button>
      </div>
    </div>
  );
}
