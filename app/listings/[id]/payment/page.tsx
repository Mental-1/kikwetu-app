"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import type { Database } from "@/utils/supabase/database.types";

type Listing = Database["public"]["Tables"]["listings"]["Row"];
type Plan = Database["public"]["Tables"]["plans"]["Row"];
type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export default function PaymentPage() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [showTimeoutOptions, setShowTimeoutOptions] = useState(false);
  const [manualCheckFailed, setManualCheckFailed] = useState(false);

  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;
  const supabase = getSupabaseClient();

  const fetchListingAndPlan = useCallback(async () => {
    const { data: listingData, error: listingError } = await supabase
      .from("listings")
      .select("*, plan_id(*)")
      .eq("id", listingId)
      .single();

    if (listingError || !listingData) {
      toast({ title: "Error", description: "Could not fetch listing details.", variant: "destructive" });
      router.push("/");
      return;
    }
    setListing(listingData);
    const planData = listingData.plan_id as Plan;
    setPlan(planData);

    if (planData?.price === 0) {
      router.push(`/listings/${listingId}`);
    }
  }, [listingId, router, supabase]);

  useEffect(() => {
    fetchListingAndPlan();
  }, [fetchListingAndPlan]);

  useEffect(() => {
    if (!transaction?.id) return;

    const channel = supabase
      .channel(`transactions:id=eq.${transaction.id}`)
      .on<
        Transaction
      >(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `id=eq.${transaction.id}` },
        (payload) => {
          const updatedTransaction = payload.new as Transaction;
          if (updatedTransaction.status === "completed") {
            setIsProcessing(false);
            toast({ title: "Payment Confirmed", description: "Your ad is now active!", variant: "default" });
            router.push(`/listings/${listingId}`);
          } else if (updatedTransaction.status === "failed") {
            setIsProcessing(false);
            toast({ title: "Payment Failed", description: "Please try again.", variant: "destructive" });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transaction?.id, listingId, router, supabase]);

  const handlePayment = async () => {
    if (!paymentMethod || !plan) return;
    setIsProcessing(true);
    setShowTimeoutOptions(false);
    setManualCheckFailed(false);

    const endpoint = `/api/payments/${paymentMethod}`;
    const payload = {
      amount: plan.price,
      listingId: listingId,
      ...(paymentMethod === 'mpesa' ? { phoneNumber } : { email }),
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({ title: "Payment Failed", description: result.error, variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      setTransaction(result.transaction);

      if (paymentMethod === "paystack") {
        const url = result?.authorization_url;
        if (typeof url === "string" && /^https?:\/\//.test(url)) {
          toast({ title: "Redirecting to Paystack", description: "Complete your payment on the Paystack page." });
          window.location.assign(url);
          return;
        }
        // Fallback: missing/invalid URL
        toast({
          title: "Paystack initialization failed",
          description: "No valid authorization URL received. Please try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      } else {
        // Only show generic toast if not Paystack or if Paystack failed to redirect
        toast({ title: "Payment Initiated", description: "Please check your phone to complete the payment." });
      }

      setTimeout(() => {
        if (transaction?.status !== "completed") {
            setShowTimeoutOptions(true);
        }
      }, 90000); // 90 seconds

    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  const handleCancelPayment = () => {
    setIsProcessing(false);
    setTransaction(null);
    setShowTimeoutOptions(false);
    toast({ title: "Payment Cancelled", variant: "destructive" });
  };

  const handleManualCheck = async () => {
    if (!transaction?.checkout_request_id) return;
    toast({ title: "Checking Payment Status..." });
    try {
        const response = await fetch(`/api/payments/status?id=${transaction.id}`);
        const data = await response.json();
        if (data.status !== "completed") {
            setManualCheckFailed(true);
        }
    } catch (error) {
        setManualCheckFailed(true);
    }
  };

  if (!listing || !plan) {
    return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="container mx-auto max-w-md py-12">
      <Card>
        <CardHeader><CardTitle>Complete Your Payment</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-medium">Paying for: {listing.title}</p>
            <p className="text-2xl font-bold text-primary">Ksh {plan.price}</p>
          </div>

          <div className="space-y-4">
            <Label>Choose Payment Method</Label>
            <div className="grid grid-cols-1 gap-3">
              <Card className={`cursor-pointer transition-all ${paymentMethod === "mpesa" ? "ring-2 ring-primary" : "hover:shadow-md"}`} onClick={() => setPaymentMethod("mpesa")}>
                <CardContent className="p-4 flex items-center space-x-3">
                  <Image src="/mpesa_logo.png" alt="M-Pesa" width={48} height={48} className="w-12 h-12 object-contain rounded-lg"/>
                  <div><p className="font-medium">M-Pesa</p><p className="text-sm text-muted-foreground">Mobile money</p></div>
                </CardContent>
              </Card>
              <Card className={`cursor-pointer transition-all ${paymentMethod === "paystack" ? "ring-2 ring-primary" : "hover:shadow-md"}`} onClick={() => setPaymentMethod("paystack")}>
                <CardContent className="p-4 flex items-center space-x-3">
                  <Image src="/PayStack_Logo.png" alt="Paystack" width={48} height={48} className="w-12 h-12 object-contain rounded-lg"/>
                  <div><p className="font-medium">Paystack</p><p className="text-sm text-muted-foreground">Card, Bank transfer</p></div>
                </CardContent>
              </Card>
            </div>
          </div>

          {paymentMethod === "mpesa" && <div><Label htmlFor="phoneNumber">M-Pesa Phone Number</Label><Input id="phoneNumber" placeholder="e.g., 254712345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ""))}/></div>}
          {paymentMethod === "paystack" && <div><Label htmlFor="email">Email Address</Label><Input id="email" type="email" placeholder="Your email for Paystack" value={email} onChange={(e) => setEmail(e.target.value)}/></div>}

          <Button onClick={handlePayment} disabled={isProcessing || !paymentMethod || (paymentMethod === 'mpesa' && !phoneNumber) || (paymentMethod === 'paystack' && !email)} className="w-full">
            {isProcessing ? "Processing..." : `Pay Ksh ${plan.price}`}
          </Button>
        </CardContent>
      </Card>
      
      <Dialog open={isProcessing && transaction?.status === 'pending'}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Awaiting Payment Confirmation</DialogTitle>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground text-center">
              Please follow the instructions on your phone or payment provider page.
            </p>
            <p className="text-sm text-muted-foreground mt-2">This window will update automatically.</p>
            
            {showTimeoutOptions && !manualCheckFailed &&
              <div className="mt-6">
                <p className="text-sm text-destructive mb-2">Taking too long?</p>
                <Button onClick={handleManualCheck} className="mr-2">I Have Paid</Button>
                <Button onClick={handleCancelPayment} variant="ghost">Cancel</Button>
              </div>
            }

            {manualCheckFailed &&
                <div className="mt-6 p-4 bg-destructive/10 rounded-lg">
                    <p className="text-sm text-destructive-foreground">We could not confirm your payment. Please do not try again. Contact support for assistance.</p>
                    <p className="font-semibold mt-2">Phone: <a href="tel:+254712345678">+254 712 345 678</a></p>
                    <p className="font-semibold">Email: <a href="mailto:support@kikwetu.com">support@kikwetu.com</a></p>
                </div>
            }
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}