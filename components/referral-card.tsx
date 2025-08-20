import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";

export function ReferralCard() {
  const { profile } = useAuthStore();
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState("");

  useEffect(() => {
    if (profile?.referral_code && typeof window !== 'undefined') {
      setReferralLink(`${window.location.origin}/auth?referral_code=${encodeURIComponent(profile.referral_code)}`);
    }
  }, [profile?.referral_code]);

  const copyToClipboard = () => {
    if (referralLink) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(referralLink)
          .then(() => {
            toast({
              title: "Copied!",
              description: "Referral link copied to clipboard.",
            });
          })
          .catch((err) => {
            console.error("Failed to copy to clipboard:", err);
            toast({
              title: "Copy Failed",
              description: "Failed to copy link. Please copy manually.",
              variant: "destructive",
            });
          });
      } else {
        // Fallback for browsers that do not support navigator.clipboard
        const textarea = document.createElement('textarea');
        textarea.value = referralLink;
        textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page in MS Edge.
        textarea.style.opacity = '0'; // Hide the textarea
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          document.execCommand('copy');
          toast({
            title: "Copied!",
            description: "Referral link copied to clipboard (fallback).",
          });
        } catch (err) {
          console.error("Failed to copy to clipboard (fallback):", err);
          toast({
            title: "Copy Failed",
            description: "Failed to copy link. Please copy manually (fallback).",
            variant: "destructive",
          });
        } finally {
          document.body.removeChild(textarea);
        }
      }
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
