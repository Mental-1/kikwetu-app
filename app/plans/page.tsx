"use client";

import { useState, useEffect } from "react";
import { PlanCard } from "@/components/plans/PlanCard";
import { PlanUpgradeModal } from "@/components/plans/PlanUpgradeModal";
import { PaymentMethodsModal } from "@/components/plans/PaymentMethodsModal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getPlans, Plan } from "@/app/post-ad/actions";

export default function PlansPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    const fetchPlans = async () => {
      const fetchedPlans = await getPlans();
      setPlans(fetchedPlans);
    };
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsUpgradeModalOpen(true);
  };

  const handleConfirmUpgrade = () => {
    setIsUpgradeModalOpen(false);
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="container px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Payment Plans</h1>
        <p className="text-muted-foreground">Choose a plan that works for you.</p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Label htmlFor="billing-cycle">Monthly</Label>
          <Switch
            id="billing-cycle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
          />
          <Label htmlFor="billing-cycle">Annual</Label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <PlanCard
            key={plan.name}
            {...plan}
            isAnnual={isAnnual}
            monthlyPrice={plan.price}
            annualPrice={Math.round(plan.price * 12 * 0.85)}
            onSelect={() => handleSelectPlan(plan)}
          />
        ))}
      </div>
      <PlanUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        selectedPlan={selectedPlan}
        isAnnual={isAnnual}
        onConfirm={handleConfirmUpgrade}
      />
      <PaymentMethodsModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        selectedPlan={selectedPlan}
      />
    </div>
  );
}
