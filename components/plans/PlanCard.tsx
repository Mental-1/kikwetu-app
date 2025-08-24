import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

interface PlanCardProps {
  name: string;
  description?: string;
  monthlyPrice: number;
  annualPrice: number;
  isAnnual: boolean;
  features: string[];
  isPopular?: boolean;
  onSelect: () => void;
}

export function PlanCard({
  name,
  description,
  monthlyPrice,
  annualPrice,
  isAnnual,
  features,
  isPopular = false,
  onSelect,
}: PlanCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentPrice = isAnnual ? annualPrice : monthlyPrice;
  const savings = Math.round(((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
        isPopular 
          ? 'border-primary shadow-[var(--shadow-hover)] bg-gradient-to-br from-card to-purple-50/50 dark:to-purple-950/20' 
          : 'hover:shadow-[var(--shadow-card)]'
      }`}>
        {isPopular && (
          <div className="absolute -top-px left-1/2 -translate-x-1/2">
            <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 px-3 py-1">
              Most Popular
            </Badge>
          </div>
        )}
        
        <CollapsibleTrigger asChild>
          <CardHeader className="text-center pb-4 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl font-bold">{name}</CardTitle>
                <div className="pt-2">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-3xl font-bold">KES {currentPrice.toLocaleString()}</span>
                    <span className="text-muted-foreground">/{isAnnual ? 'year' : 'month'}</span>
                  </div>
                  
                  {isAnnual && savings > 0 && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300">
                        Save {savings}%
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 md:hidden ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <CardDescription className="text-sm hidden md:block">{description || "No description available."}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <CardDescription className="text-sm md:hidden text-center">{description || "No description available."}</CardDescription>
            
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              onClick={onSelect}
              className="w-full bg-green-600 hover:bg-green-700 text-white transition-all duration-300 shadow-lg"
            >
              Get Started
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
