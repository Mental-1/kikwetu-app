"use client";

import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { getSupabaseClient } from "@/utils/supabase/client";
import { logger } from "@/lib/utils/logger";

const SUBSCRIPTION_ACTIVATION_TIMEOUT_MS = 40000;
const POLLING_INTERVAL = 5000;

type PaymentStatus = "idle" | "pending" | "completed" | "failed" | "cancelled";

interface PaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: any;
}

export function PaymentMethodsModal({ isOpen, onClose, selectedPlan }: PaymentMethodsModalProps) {
  const { formData, updateFormData, discountCodeInput, setDiscountCodeInput, appliedDiscount, setAppliedDiscount, discountMessage, setDiscountMessage } = useSubscriptionStore();
  const [showDiscountCodeSection, setShowDiscountCodeSection] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [showSupportDetails, setShowSupportDetails] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPaymentStatus("idle");
      setCurrentTransactionId(null);
      setShowRetryButton(false);
      setShowSupportDetails(false);
      setDiscountCodeInput("");
      setAppliedDiscount(null);
      setDiscountMessage(null);
      updateFormData({ paymentMethod: "mpesa", phoneNumber: "", email: "" });
    }
  }, [isOpen, setDiscountCodeInput, setAppliedDiscount, setDiscountMessage, updateFormData]);

  const mapDiscountErrorMessage = (error: Error): string => {
    if (error.message.includes("Invalid discount code")) {
      return "Invalid discount code. Please check and try again.";
    } else if (error.message.includes("Discount code is not active")) {
      return "Discount code is not active.";
    } else if (error.message.includes("Discount code has expired")) {
      return "Discount code has expired.";
    } else if (error.message.includes("Discount code has reached its maximum uses")) {
      return "Discount code has reached its maximum uses.";
    } else if (error.message.includes("Network error")) {
      return "Network error. Please check your internet connection.";
    } else if (error.message.includes("Failed to apply discount")) {
      return "Failed to apply discount. Please try again.";
    }
    return "An unexpected error occurred while applying discount.";
  };

  const handleApplyDiscount = async () => {
    if (!discountCodeInput) {
      setDiscountMessage("Please enter a discount code.");
      return;
    }

    try {
      const response = await fetch("/api/payments/apply-discount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: discountCodeInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAppliedDiscount(null);
        throw new Error(data.error || "Failed to apply discount.");
      }

      setAppliedDiscount(data);
      if (data.type === "EXTRA_LISTING_DAYS") {
        setDiscountMessage(`Success! ${data.value} extra days will be added to your subscription.`);
      } else if (data.type === "PERCENTAGE_DISCOUNT") {
        setDiscountMessage(`Success! ${data.value}% discount applied.`);
      } else if (data.type === "FIXED_AMOUNT_DISCOUNT") {
        setDiscountMessage(`Success! Ksh ${data.value} discount applied.`);
      }
      toast({
        title: "Discount Applied",
        description: "Discount code successfully applied!",
        variant: "default",
      });
    } catch (error) {
      console.error("Error applying discount:", error);
      setAppliedDiscount(null);
      const userMessage = mapDiscountErrorMessage(error instanceof Error ? error : new Error("Unknown error"));
      setDiscountMessage(userMessage);
      toast({
        title: "Error",
        description: userMessage,
        variant: "destructive",
      });
    }
  };

  const processPayment = async (plan: any, paymentMethod: string, appliedDiscount: { type: string; value: number; code_id: string } | null) => {
    let finalAmount = plan.price;
    if (appliedDiscount) {
      if (appliedDiscount.type === "PERCENTAGE_DISCOUNT") {
        finalAmount = plan.price - (plan.price * appliedDiscount.value) / 100;
      } else if (appliedDiscount.type === "FIXED_AMOUNT_DISCOUNT") {
        finalAmount = plan.price - appliedDiscount.value;
      }
    }
    // Clamp to >= 0 and round to 2 decimals
    finalAmount = Math.max(0, Number(finalAmount.toFixed(2)));

    const paymentData = {
      amount: finalAmount,
      phoneNumber: formData.phoneNumber,
      email: formData.email,
      description: `Kikwetu Subscription - ${plan.name} Plan`,
      planId: plan.id,
      discountCodeId: appliedDiscount?.code_id ? Number(appliedDiscount.code_id) : undefined,
    };

    let endpoint = "";
    switch (paymentMethod) {
      case "mpesa":
        endpoint = "/api/payments/mpesa";
        break;
      case "paystack":
        endpoint = "/api/payments/paystack";
        break;
      default:
        return { success: false, error: "Invalid payment method" };
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: responseData.error || "Payment failed",
        };
      }

      return {
        success: true,
        ...responseData,
      };
    } catch (error) {
      logger.error({ message: "Payment request error", error });
      return { success: false, error: "Network error during payment" };
    }
  };

  const handlePay = async () => {
    if (!selectedPlan) return;

    setPaymentStatus("pending");

    try {
      const paymentResult = await processPayment(
        selectedPlan,
        formData.paymentMethod,
        appliedDiscount,
      );

      if (!paymentResult || !paymentResult.success) {
        toast({
          title: "Payment Failed",
          description:
            paymentResult?.error ||
            "Your payment could not be processed. Please try again.",
          variant: "destructive",
        });
        setPaymentStatus("failed");
        return;
      }

      setCurrentTransactionId(paymentResult.transaction.id);
      toast({
        title: "Payment Initiated",
        description:
          "Your payment is being processed. Please wait for confirmation.",
        variant: "default",
      });
    } catch (error) {
      logger.error({ message: "Payment processing error", error });
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred during payment.",
        variant: "destructive",
      });
      setPaymentStatus("failed");
    }
  };

  const checkTransactionStatus = useCallback(async () => {
    if (!currentTransactionId) return;

    const supabase = getSupabaseClient();

    try {
      const response = await fetch(
        `/api/payments/status?id=${currentTransactionId}`,
      );
      const data = await response.json();

      if (response.ok && data.status) {
        setPaymentStatus(data.status);
        if (data.status === "pending") {
          setTimeout(() => {
            setShowSupportDetails(true);
          }, 30000);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch transaction status. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error({ message: "Error checking transaction status", error });
      toast({
        title: "Error",
        description: "Network error while checking status. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentTransactionId]);

  useEffect(() => {
    if (!currentTransactionId || paymentStatus === 'completed') return;

    const supabase = getSupabaseClient();
    logger.info('Starting polling backup for transaction status...');

    const pollInterval = setInterval(async () => {
      try {
        const { data: transaction, error } = await supabase
          .from('transactions')
          .select('status, psp_transaction_id')
          .eq('id', currentTransactionId)
          .single();

        if (error) {
          logger.error({ error }, 'Polling error');
          return;
        }

        if (transaction?.status === 'completed') {
          logger.info('Polling detected completed payment, updating status...');
          setPaymentStatus('completed');
          clearInterval(pollInterval);
        }
      } catch (error) {
        logger.error({ error }, 'Polling exception');
      }
    }, POLLING_INTERVAL);

    return () => {
      logger.info('Clearing polling interval');
      clearInterval(pollInterval);
    };
  }, [currentTransactionId, paymentStatus]);

  useEffect(() => {
    if (!currentTransactionId) return;

    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`transactions:id=eq.${currentTransactionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `id=eq.${currentTransactionId}`,
        },
        async (payload) => {
          try {
            logger.info({
              message: 'Realtime transaction update received',
              transactionId: currentTransactionId,
              oldStatus: payload.old?.status,
              newStatus: payload.new?.status,
              pspTransactionId: payload.new?.psp_transaction_id,
              timestamp: new Date().toISOString()
            });

            const newStatus = payload.new.status as PaymentStatus;
            setPaymentStatus(newStatus);

            if (newStatus === "completed") {
              logger.info('Payment completed, activating subscription...');

              // Call a new API endpoint to activate the subscription
              try {
                const activateResponse = await fetch("/api/payments/subscriptions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ planId: selectedPlan.id, transactionId: currentTransactionId }),
                });

                if (!activateResponse.ok) {
                  throw new Error("Failed to activate subscription");
                }
                toast({
                  title: "Subscription Activated",
                  description: "Your subscription is now active!",
                  variant: "default",
                });
                onClose(); // Close the modal on success
              } catch (activationError) {
                logger.error({ message: "Error activating subscription", error: activationError });
                toast({
                  title: "Activation Failed",
                  description: "Payment processed but failed to activate subscription. Contact support.",
                  variant: "destructive",
                });
              }
            } else if (newStatus === "failed" || newStatus === "cancelled") {
              logger.info({ status: newStatus }, 'Payment failed or cancelled');
              toast({
                title: "Payment Failed",
                description: "Your payment was not successful. Please try again.",
                variant: "destructive",
              });
            } else {
              logger.info({ status: newStatus }, 'Transaction status updated to');
            }
          } catch (error) {
            logger.error({ message: "Error in realtime transaction update handler", error });
            const newStatus = payload.new?.status as PaymentStatus;
            if (newStatus) {
              setPaymentStatus(newStatus);
            }
          }
        },
      )
      .subscribe((status, err) => {
        if (err) {
          logger.error({ error: err }, 'Realtime subscription error');
        } else {
          logger.info({ status }, 'Realtime subscription status');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTransactionId, selectedPlan, onClose]);

  useEffect(() => {
    if (paymentStatus === "pending" && currentTransactionId) {
      const timer = setTimeout(() => {
        setShowRetryButton(true);
      }, 60000); // Show retry button after 60 seconds

      return () => clearTimeout(timer);
    } else {
      setShowRetryButton(false);
      setShowSupportDetails(false);
    }
  }, [paymentStatus, currentTransactionId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90%] mx-auto rounded-xl sm:max-w-lg">
        {paymentStatus === "idle" && (
          <>
            <DialogHeader>
              <DialogTitle>Choose Payment Method</DialogTitle>
              <DialogDescription>
                Select a payment method to complete your purchase.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-discount"
                  checked={showDiscountCodeSection}
                  onCheckedChange={(checked) =>
                    setShowDiscountCodeSection(Boolean(checked))
                  }
                />
                <Label htmlFor="show-discount">I have a discount code</Label>
              </div>

              {showDiscountCodeSection && (
                <div className="space-y-2">
                  <Label htmlFor="discountCode">Discount Code</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="discountCode"
                      placeholder="Enter discount code"
                      value={discountCodeInput}
                      onChange={(e) => {
                        setDiscountCodeInput(e.target.value);
                        setDiscountMessage(null);
                        setAppliedDiscount(null);
                      }}
                      disabled={!!appliedDiscount}
                      className={discountMessage && !appliedDiscount ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {!appliedDiscount && (
                      <Button onClick={handleApplyDiscount} disabled={!discountCodeInput.trim()} className="bg-green-500 hover:bg-green-600 text-white rounded-lg">
                        Apply
                      </Button>
                    )}
                  </div>
                  {discountMessage && (
                    <p className={`text-sm ${appliedDiscount ? 'text-green-600' : 'text-red-600'}`}>
                      {discountMessage}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label>Choose Payment Method</Label>
                <div className="grid grid-cols-1 gap-3 mt-2">
                  <Card
                    className={`cursor-pointer transition-all ${formData.paymentMethod === "mpesa" ? "ring-2 ring-blue-500" : "hover:shadow-md"}`}
                    onClick={() => updateFormData({ paymentMethod: "mpesa" })}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Image
                          src="/mpesa_logo.png"
                          alt="M-Pesa Logo"
                          width={48}
                          height={48}
                          className="w-12 h-12 object-contain rounded-lg"
                        />
                        <div>
                          <p className="font-medium">M-Pesa</p>
                          <p className="text-sm text-muted-foreground">
                            Pay with your mobile money
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer transition-all ${formData.paymentMethod === "paystack" ? "ring-2 ring-blue-500" : "hover:shadow-md"}`}
                    onClick={() => updateFormData({ paymentMethod: "paystack" })}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Image
                          src="/PayStack_Logo.png"
                          alt="Paystack Logo"
                          width={48}
                          height={48}
                          className="w-12 h-12 object-contain rounded-lg"
                        />
                        <div>
                          <p className="font-medium">Paystack</p>
                          <p className="text-sm text-muted-foreground">
                            Credit/Debit card, Bank transfer
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              {formData.paymentMethod === "mpesa" && (
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="Enter your M-Pesa number"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      updateFormData({
                        phoneNumber: e.target.value.replace(/[^\d]/g, ""),
                      })
                    }
                  />
                </div>
              )}
              {formData.paymentMethod === "paystack" && (
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => updateFormData({ email: e.target.value })}
                  />
                </div>
              )}
              <Button onClick={handlePay} className="w-full bg-green-600 hover:bg-green-700 text-white">
                Pay
              </Button>
            </div>
          </>
        )}

        {paymentStatus === "pending" && (
          <>
            <DialogTitle className="text-center">Processing Payment</DialogTitle>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-12 w-12 text-orange-500 mb-4 animate-pulse" />
              <p className="text-muted-foreground text-center">
                Please wait while we process your payment.
                <br />
                <span className="text-sm">Transaction ID: {currentTransactionId || "Pending..."}</span>
              </p>
              {showRetryButton && (
                <Button onClick={checkTransactionStatus} className="mt-4 text-sm py-1 px-2 bg-green-500 hover:bg-green-600 text-white transition-colors" >
                  I have paid
                </Button>
              )}
              {showSupportDetails && (
                <p className="text-sm text-muted-foreground mt-2">
                  Payment still pending. Please contact support with Transaction ID:{" "}
                  {currentTransactionId}
                  <br />
                  Email: support@kikwetu.com
                </p>
              )}
            </div>
          </>
        )}

        {paymentStatus === "completed" && (
          <>
            <DialogTitle className="text-center text-green-600">Payment Successful!</DialogTitle>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-12 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">Your subscription is now active. Thank you.</p>
              <p className="text-muted-foreground text-center">
                <span className="text-sm">Transaction ID: {currentTransactionId}</span>
              </p>
            </div>
          </>
        )}

        {(paymentStatus === "failed" || paymentStatus === "cancelled") && (
          <>
            <DialogTitle className="text-center text-red-600">Payment Failed</DialogTitle>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg font-medium">Sorry. Payment failed.</p>
              <p className="text-muted-foreground text-center">
                Please try again.
                <br />
                <span className="text-sm">Transaction ID: {currentTransactionId}</span>
              </p>
              <Button onClick={handlePay} className="mt-4 text-sm py-1 px-2 bg-red-500 text-white" >
                Pay again
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}