import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface Plan {
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  isPopular?: boolean;
}

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: Plan | null;
  isAnnual: boolean;
  onConfirm: () => void;
}

export function PlanUpgradeModal({
  isOpen,
  onClose,
  selectedPlan,
  isAnnual,
  onConfirm,
}: PlanUpgradeModalProps) {
  if (!selectedPlan) return null;

  const currentPrice = isAnnual ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;
  const savings = Math.round(((selectedPlan.monthlyPrice * 12 - selectedPlan.annualPrice) / (selectedPlan.monthlyPrice * 12)) * 100);
  const periodText = isAnnual ? 'year' : 'month';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[90%] mx-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Upgrade to {selectedPlan.name}
            {selectedPlan.isPopular && (
              <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
                Popular
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedPlan.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Price Display */}
          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-3xl font-bold text-foreground">KES {currentPrice.toLocaleString()}</span>
              <span className="text-muted-foreground">/{periodText}</span>
            </div>
            
            {isAnnual && savings > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300">
                Save {savings}% with annual billing
              </Badge>
            )}
          </div>

          {/* Features List */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-foreground">What&apos;s included:</h4>
            <ul className="space-y-2">
              {selectedPlan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm Upgrade
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
