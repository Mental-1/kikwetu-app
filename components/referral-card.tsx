import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";

export function ReferralCard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState("");

  useEffect(() => {
    if (profile?.referral_code && typeof window !== 'undefined') {
      setReferralLink(`${window.location.origin}/auth?referral_code=${profile.referral_code}`);
    }
  }, [profile?.referral_code]);

  const copyToClipboard = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard.",
      });
    }
  };

  if (!profile?.referral_code) {
    return null; // Don't render if no referral code is available yet
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refer a Friend</CardTitle>
        <CardDescription>
          Share your unique referral link and earn rewards!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2">
          <Input value={referralLink} readOnly className="flex-1" />
          <Button type="button" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
            <span className="sr-only">Copy</span>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          New users signing up through your link will receive a special discount.
        </p>
      </CardContent>
    </Card>
  );
}
