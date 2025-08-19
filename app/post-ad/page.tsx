"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useCategories,
  useSubcategoriesByCategory,
} from "@/hooks/useCategories";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
} from "lucide-react";
import { MediaBufferInput } from "@/components/post-ad/media-buffer-input";
import { toast } from "@/components/ui/use-toast";
import { uploadBufferedMedia } from "./actions/upload-buffered-media";
import { getSupabaseClient } from "@/utils/supabase/client";
import { logger } from "@/lib/utils/logger";
import { getPlans, Plan } from "./actions";
import { formatPrice } from "@/lib/utils";
import { usePostAdStore } from "@/stores/postAdStore";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Database } from "@/utils/supabase/database.types";
import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type SubCategory = Database["public"]["Tables"]["subcategories"]["Row"];
type PaymentStatus = "idle" | "pending" | "completed" | "failed" | "cancelled";

const LISTING_ACTIVATION_TIMEOUT_MS = 40000;

const POLLING_INTERVAL = 5000;

const formatLocationData = (location: any) => {
  const isCoordinates = Array.isArray(location) && location.length === 2;
  return {
    displayLocation: isCoordinates
      ? `Lat: ${location[0]}, Lng: ${location[1]}`
      : location,
    latitude: isCoordinates ? location[0] : null,
    longitude: isCoordinates ? location[1] : null,
  };
};

const steps = [
  { id: "details", label: "Details" },
  { id: "payment", label: "Plan" },
  { id: "media", label: "Media" },
  { id: "preview", label: "Preview" },
  { id: "method", label: "Method" },
];

export default function PostAdPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [pendingListingId, setPendingListingId] = useState<string | null>(null);

  const { formData, updateFormData, discountCodeInput, setDiscountCodeInput, appliedDiscount, setAppliedDiscount, discountMessage, setDiscountMessage } = usePostAdStore();

  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [manualLocation, setManualLocation] = useState("");

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();
  const selectedCategory = categories.find((c) => c.name === formData.category);
  const { data: subcategories = [] } = useSubcategoriesByCategory(
    selectedCategory?.id || null,
  );

  useEffect(() => {
    const fetchPlans = async () => {
      const fetchedPlans = await getPlans();
      setPlans(fetchedPlans);
      if (fetchedPlans.length > 0) {
        updateFormData({ paymentTier: fetchedPlans[0].id });
      }
    };
    fetchPlans();
  }, [updateFormData]);

  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const selectedTier =
    plans.find((tier) => tier.id === formData.paymentTier) || plans[0];

  // Form validation helper
  const isFormValid = () => {
    const basicFieldsValid =
      formData.title.trim().length >= 3 &&
      formData.description.trim().length >= 3 &&
      formData.category &&
      formData.price !== "" &&
      !isNaN(Number(formData.price)) &&
      Number(formData.price) > 0 &&
      formData.location.length > 0;

    if (selectedTier?.price > 0) {
      const paymentFieldsValid =
        formData.paymentMethod &&
        (formData.paymentMethod === "mpesa"
          ? /^[0-9]{10,15}$/.test(formData.phoneNumber)
          : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email));
      return basicFieldsValid && paymentFieldsValid;
    }

    return basicFieldsValid;
  };

  const handleAdvanceStep = async () => {
    if (currentStep === 0 && !isFormValid()) {
      toast({
        title: "Missing Information",
        description:
          "Please fill out all required fields and ensure they are valid before proceeding.",
        variant: "destructive",
      });
      return;
    }

    // Create pending listing after preview step (step 3)
    if (currentStep === 3) {
      await createPendingListing();
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [isPublishingListing, setIsPublishingListing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [currentTransactionId, setCurrentTransactionId] = useState<
    string | null
  >(null);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [showSupportDetails, setShowSupportDetails] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);


  const { displayLocation, latitude, longitude } = formatLocationData(
    formData.location,
  );

  // Create pending listing after preview step
  const createPendingListing = async () => {
    if (pendingListingId) return; // Already created

    setIsCreatingListing(true);

    try {
      // Upload media first
      const uploadedMediaResults = await uploadBufferedMedia(
        formData.mediaUrls,
        "listings",
      );
      const finalMediaUrls = uploadedMediaResults.map((res) => res.url);

      const listingData = {
        title: formData.title,
        description: formData.description,
        price: Number.parseFloat(formData.price) || null,
        category_id:
          categories.find((cat) => cat.name === formData.category)?.id || null,
        subcategory_id: formData.subcategory
          ? Number.parseInt(formData.subcategory)
          : null,
        location: displayLocation,
        latitude: latitude,
        longitude: longitude,
        condition: formData.condition,
        images: finalMediaUrls,
        tags: formData.tags,
        paymentTier: formData.paymentTier,
        paymentStatus: selectedTier.price === 0 ? "paid" : "unpaid",
        paymentMethod: null,
        status: selectedTier.price === 0 ? "active" : "pending",
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        negotiable: formData.negotiable,
        plan_id: selectedTier.id,
      };

      const response = await fetch(
        process.env.NEXT_PUBLIC_APP_URL + "/api/listings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(listingData),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create listing");
      }

      setPendingListingId(result.listing.id);

      toast({
        title: "Draft Created",
        description:
          "Your listing draft has been saved. Complete payment to publish.",
        variant: "default",
      });
    } catch (error) {
      logger.error({ message: "Error creating pending listing", error });
      toast({
        title: "Error",
        description: "Failed to create listing draft. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsCreatingListing(false);
    }
  };

  // Activate listing after successful payment
  const activateListing = useCallback(async () => {
    if (!pendingListingId) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/listings/${pendingListingId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "active",
            paymentStatus: "paid",
            paymentMethod: formData.paymentMethod,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to activate listing");
      }
    } catch (error) {
      logger.error({ message: "Error activating listing", error });
      toast({
        title: "Error",
        description:
          "Payment processed but failed to activate listing. Contact support.",
        variant: "destructive",
      });
    }
  }, [pendingListingId, formData.paymentMethod]);

  // Payment status monitoring
  // Auto-open on transitions that need user attention.
  useEffect(() => {
    if (
      paymentStatus === "pending" ||
      paymentStatus === "failed" ||
      paymentStatus === "cancelled"
    ) {
      setIsModalOpen(true);
    }
  }, [paymentStatus]);

  // Auto-close shortly after completion if currently open.
  useEffect(() => {
    if (paymentStatus === "completed" && isModalOpen) {
      const timer = setTimeout(() => setIsModalOpen(false), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [paymentStatus, isModalOpen]);


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
              logger.info('Payment completed, checking listing status...');
              
              // Check if listing activation is needed (edge case handling)
              try {
                let listing, listingError;
                let retries = 3;
                
                while (retries > 0) {
                  const result = await supabase
                    .from('listings')
                    .select('status, payment_status, activated_at')
                    .eq('id', pendingListingId)
                    .single();
                  
                  listing = result.data;
                  listingError = result.error;
                  
                  if (!listingError) break;
                  
                  retries--;
                  if (retries > 0) {
                    logger.warn(`Retrying listing status check, ${retries} attempts remaining`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Simple backoff for now
                  }
                }

                if (listingError) {
                  logger.error({ message: 'Error fetching listing status after retries', error: listingError });
                  throw listingError;
                }

                logger.info({
                  message: 'Current listing status',
                  listingId: pendingListingId,
                  status: listing?.status,
                  paymentStatus: listing?.payment_status,
                  activatedAt: listing?.activated_at,
                  needsActivation: listing?.status !== 'active' || listing?.payment_status !== 'paid'
                });

                // Only activate if backend hasn't already done it (edge case)
                if (listing?.status !== 'active' || listing?.payment_status !== 'paid') {
                  logger.info('Listing not yet activated by backend, calling frontend activation...');
                  
                  // Set timeout for activation to prevent hanging
                  const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`Listing activation timeout after ${LISTING_ACTIVATION_TIMEOUT_MS / 1000} seconds`)), LISTING_ACTIVATION_TIMEOUT_MS)
                  );

                  await Promise.race([activateListing(), timeoutPromise]);
                  logger.info('Frontend listing activation completed successfully');
                } else {
                  logger.info('Listing already activated by backend, skipping frontend activation');
                }

              } catch (activationError) {
                logger.error({
                  message: 'Error during listing activation check/process',
                  error: activationError,
                  errorMessage: activationError instanceof Error ? activationError.message : 'Unknown error',
                  transactionId: currentTransactionId,
                  listingId: pendingListingId,
                  timestamp: new Date().toISOString()
                });
                
                // Don't prevent success flow - backend likely already handled it
                logger.info('Continuing with success flow despite activation error (backend likely already handled)');
              }

              // Always show success message and redirect (even if activation had issues)
              logger.info('Showing success toast and redirecting...');
              
              toast({
                title: "Payment Confirmed",
                description: "Your payment has been processed and your ad is now live!",
                variant: "default",
              });

              // Clean up subscription
              channel.unsubscribe();
              logger.info('Realtime subscription unsubscribed');

              // Redirect to the listing
              if (pendingListingId) {
                logger.info(`Redirecting to listing: /listings/${pendingListingId}`);
                router.push(`/listings/${pendingListingId}`);
              } else {
                logger.warn('No pendingListingId available for redirect');
              }

            } else if (newStatus === "failed" || newStatus === "cancelled") {
              logger.info({ status: newStatus }, 'Payment failed or cancelled');
              
              toast({
                title: "Payment Failed",
                description: "Your payment was not successful. Please try again.",
                variant: "destructive",
              });

              channel.unsubscribe();
              logger.info('Realtime subscription unsubscribed after payment failure');

            } else {
              logger.info({ status: newStatus }, 'Transaction status updated to');
              // Handle other statuses (pending, processing, etc.)
            }

          } catch (error) {
            logger.error({
              message: 'Error in realtime transaction update handler',
              error: error,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              payload: payload,
              transactionId: currentTransactionId,
              timestamp: new Date().toISOString()
            });

            // Don't prevent UI updates on handler errors
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

    // Cleanup function
    return () => {
      logger.info('Cleaning up realtime subscription on component unmount');
      supabase.removeChannel(channel);
    };
  }, [currentTransactionId, pendingListingId, router, activateListing]);

  // Optional: Add a polling backup in case realtime fails
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

    // Cleanup polling on unmount or completion
    return () => {
      logger.info('Clearing polling interval');
      clearInterval(pollInterval);
    };
  }, [currentTransactionId, paymentStatus]);

  const checkTransactionStatus = useCallback(async () => {
    if (!currentTransactionId) return;

    try {
      const response = await fetch(
        `/api/payments/status?id=${currentTransactionId}`,
      );
      const data = await response.json();

      if (response.ok && data.status) {
        setPaymentStatus(data.status);
        if (data.status === "pending") {
          // If still pending after retry, show support details after 30 seconds
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
    if (paymentStatus === "pending" && currentTransactionId) {
      const timer = setTimeout(() => {
        setShowRetryButton(true);
      }, 60000); // Show retry button after 60 seconds

      return () => clearTimeout(timer);
    } else {
      setShowRetryButton(false);
      setShowSupportDetails(false);
      return; // Explicitly return void
    }
  }, [paymentStatus, currentTransactionId]);

  // Handle final submission (payment or activation for free tier)
  const handleSubmit = async () => {
    if (isSubmitted || isPublishingListing || paymentStatus === "pending" || paymentStatus === "completed")
      return;

    if (!pendingListingId) {
      toast({
        title: "Error",
        description: "No listing found. Please go back and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitted(true);

    if (!selectedTier) {
      toast({
        title: "Error",
        description: "Invalid payment tier selected.",
        variant: "destructive",
      });
      setIsSubmitted(false);
      return;
    }

    // Handle free tier - just activate the listing
    if (selectedTier.price === 0) {
      setIsPublishingListing(true);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/listings/${pendingListingId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "active",
              paymentStatus: "free",
              paymentMethod: null,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to activate listing");
        }

        toast({
          title: "Success",
          description: "Your ad has been published successfully!",
          variant: "default",
          duration: 5000,
        });

        router.push(`/listings/${pendingListingId}`);
      } catch (error) {
        logger.error({ message: "Error activating free listing", error });
        toast({
          title: "Error",
          description: "Failed to publish your ad. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsPublishingListing(false);
        setIsSubmitted(false);
      }
      return;
    }

    // Handle paid tier - initiate payment
    if (selectedTier.price > 0) {
      setPaymentStatus("pending");

      try {
        const paymentResult = await processPayment(
          selectedTier,
          formData.paymentMethod,
          appliedDiscount, // Pass appliedDiscount here
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
          setIsSubmitted(false);
          return;
        }

        setCurrentTransactionId(paymentResult.transaction.id);
        toast({
          title: "Payment Initiated",
          description:
            "Your payment is being processed. Please wait for confirmation.",
          variant: "default",
        });
        setIsSubmitted(false);
        return;
      } catch (error) {
        logger.error({ message: "Payment processing error", error });
        toast({
          title: "Payment Error",
          description: "An unexpected error occurred during payment.",
          variant: "destructive",
        });
        setPaymentStatus("failed");
        setIsSubmitted(false);
        return;
      }
    }
  };

  const processPayment = async (tier: Plan, paymentMethod: string, appliedDiscount: { type: string; value: number; code_id: number } | null) => {
    if (!pendingListingId) {
      return { success: false, error: "No listing ID found." };
    }

    let finalAmount = tier.price;
    if (appliedDiscount) {
      if (appliedDiscount.type === "PERCENTAGE_DISCOUNT") {
        finalAmount = tier.price - (tier.price * appliedDiscount.value / 100);
      } else if (appliedDiscount.type === "FIXED_AMOUNT_DISCOUNT") {
        finalAmount = tier.price - appliedDiscount.value;
      }
      // Ensure amount doesn't go below zero
      finalAmount = Math.max(0, finalAmount);
    }

    const paymentData = {
      amount: finalAmount,
      phoneNumber: formData.phoneNumber,
      email: formData.email,
      description: `Kikwetu Listing - ${tier.name} Plan`,
      listingId: pendingListingId,
      discountCodeId: appliedDiscount?.code_id, // Pass the applied discount code ID
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

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateFormData({
            location: [position.coords.latitude, position.coords.longitude],
          });
          setLocationDialogOpen(false);
        },
        (error) => {
          logger.error({ message: "Error getting location", error });
          toast({
            title: "Location Error",
            description:
              "Failed to detect your location. Please enter it manually or try again.",
            variant: "destructive",
          });
        },
        { enableHighAccuracy: true },
      );
    }
  };

  const renderStepContent = () => {
    const currentStepId = steps[currentStep]?.id;
    switch (currentStepId) {
      case "details":
        return (
          <AdDetailsStep
            categories={categories}
            subcategories={subcategories}
            locationDialogOpen={locationDialogOpen}
            setLocationDialogOpen={setLocationDialogOpen}
            manualLocation={manualLocation}
            setManualLocation={setManualLocation}
            detectLocation={detectLocation}
            categoriesError={categoriesError}
            categoriesLoading={categoriesLoading}
          />
        );
      case "payment":
        return (
          <PaymentTierStep
            plans={plans}
          />
        );
      case "media":
        return (
          <MediaUploadStep
            plans={plans}
          />
        );
      case "preview":
        return (
          <PreviewStep
            categories={categories}
            plans={plans}
            displayLocation={displayLocation}
          />
        );
      case "method":
        return (
          <PaymentMethodStep
            plans={plans}
            paymentStatus={paymentStatus}
            pendingListingId={pendingListingId}
            showRetryButton={showRetryButton}
            showSupportDetails={showSupportDetails}
            onRetryPayment={checkTransactionStatus}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 py-8">
      <div className="container px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Post an Ad</h1>

          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= index
                        ? "bg-blue-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="text-xs mt-1">{step.label}</span>
                </div>
              ))}
            </div>
            <div className="relative mt-2">
              <div className="absolute top-0 left-0 h-1 bg-muted w-full"></div>
              <div
                className="absolute top-0 left-0 h-1 bg-blue-600 transition-all"
                style={{
                  width: `${(currentStep / (steps.length - 1)) * 100}%`,
                }}
              ></div>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              {renderStepContent()}

              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={
                    currentStep === 0 ||
                    paymentStatus === "pending" ||
                    isCreatingListing
                  }
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {currentStep === steps.length - 1 ? (
                  <Button
                    onClick={
                      (selectedTier?.price === 0 || paymentStatus === "completed") && pendingListingId
                        ? () => router.push(`/listings/${pendingListingId}`)
                        : handleSubmit
                    }
                    disabled={
                      !isFormValid() ||
                      isSubmitted ||
                      isPublishingListing ||
                      !pendingListingId ||
                      (selectedTier?.price > 0 && paymentStatus === "pending")
                    }
                    className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
                  >
                    {isPublishingListing
                      ? "Publishing..."
                      : (selectedTier?.price === 0 || paymentStatus === "completed") && pendingListingId
                        ? "Go to listing"
                        : "Pay & Publish"}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleAdvanceStep}
                    disabled={
                      isSubmitted || isPublishingListing || isCreatingListing
                    }
                    className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
                  >
                    {isCreatingListing && currentStep === 3
                      ? "Creating..."
                      : "Next"}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isCreatingListing || isPublishingListing}>
        <DialogContent className="w-[75%] mx-auto rounded-xl sm:max-w-[425px]">
          <DialogTitle className="text-center">
            {isCreatingListing ? "Creating Draft..." : "Publishing Ad..."}
          </DialogTitle>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-orange-500 mb-4 animate-pulse" />
            <p className="text-muted-foreground">
              {isCreatingListing
                ? "Creating your listing draft..."
                : "Publishing your ad..."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdDetailsStep({
  categories,
  subcategories,
  locationDialogOpen,
  setLocationDialogOpen,
  manualLocation,
  setManualLocation,
  detectLocation,
  categoriesError,
  categoriesLoading,
}: {
  categories: any[];
  subcategories: any[];
  locationDialogOpen: boolean;
  setLocationDialogOpen: (open: boolean) => void;
  manualLocation: string;
  setManualLocation: (val: string) => void;
  detectLocation: () => void;
  categoriesError: any;
  categoriesLoading: boolean;
}) {
  const { formData, updateFormData } = usePostAdStore();
  const availableSubcategories = formData.category ? subcategories : [];

  const formatPrice = (value: string | number) => {
    if (value === null || value === undefined || value === "") return "";
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return num.toLocaleString();
  };

  const parsePrice = (value: string) => {
    const cleaned = value.replace(/,/g, "");
    const num = Number(cleaned);
    return isNaN(num) ? "" : num.toString();
  };

  const [displayPrice, setDisplayPrice] = useState(formatPrice(formData.price));

  useEffect(() => {
    setDisplayPrice(formatPrice(formData.price));
  }, [formData.price]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setDisplayPrice(rawValue);
    const parsedValue = parsePrice(rawValue);
    updateFormData({ price: parsedValue });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Ad Details</h2>
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Enter a descriptive title"
            value={formData.title}
            onChange={(e) => updateFormData({ title: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe your item in detail"
            rows={4}
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Category</Label>
            {categoriesLoading && <p>Loading categories...</p>}
            {categoriesError && (
              <div className="text-red-500">
                Failed to load categories. Please try again.
              </div>
            )}
            {!categoriesLoading && !categoriesError && (
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  updateFormData({ category: value, subcategory: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label htmlFor="subcategory">Subcategory</Label>
            <Select
              value={formData.subcategory}
              onValueChange={(value) => updateFormData({ subcategory: value })}
              disabled={!availableSubcategories.length}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subcategory" />
              </SelectTrigger>
              <SelectContent>
                {availableSubcategories.map((subcategory) => (
                  <SelectItem
                    key={subcategory.id}
                    value={String(subcategory.id)}
                  >
                    {subcategory.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="text"
              placeholder="Enter price"
              value={displayPrice}
              onChange={handlePriceChange}
              onBlur={(e) =>
                setDisplayPrice(formatPrice(parsePrice(e.target.value)))
              }
            />
          </div>
          <div>
            <Label htmlFor="condition">Condition</Label>
            <Select
              value={formData.condition}
              onValueChange={(value) => updateFormData({ condition: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="refurbished">Refurbished</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="tags">Tags</Label>
          <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md bg-background">
            {formData.tags.map((tag: string, index: number) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const newTags = [...formData.tags];
                    newTags.splice(index, 1);
                    updateFormData({ tags: newTags });
                  }}
                >
                  &times;
                </button>
              </div>
            ))}
            <Input
              id="tags-input"
              placeholder="Add tags (e.g., handmade, vintage)"
              className="flex-grow bg-transparent border-none focus:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const newTag = e.currentTarget.value.trim();
                  if (newTag && !formData.tags.includes(newTag)) {
                    updateFormData({ tags: [...formData.tags, newTag] });
                    e.currentTarget.value = "";
                  }
                }
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Press Enter or Comma to add a tag.
          </p>
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <div className="flex gap-2">
            <Input
              id="location"
              placeholder="Choose location"
              readOnly
              value={
                Array.isArray(formData.location) && formData.location.length > 0
                  ? `Lat: ${formData.location[0]}, Lng: ${formData.location[1]}`
                  : String(formData.location || "")
              }
              onClick={() => setLocationDialogOpen(true)}
              className="cursor-pointer bg-background"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="negotiable"
            checked={formData.negotiable}
            onCheckedChange={(checked) =>
              updateFormData({ negotiable: Boolean(checked) })
            }
          />
          <Label htmlFor="negotiable">Price is negotiable</Label>
        </div>
      </div>

      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="w-[75%] mx-auto rounded-xl sm:max-w-[425px]">
          <DialogTitle>Set Location</DialogTitle>
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-location">Enter location manually</Label>
              <Input
                id="manual-location"
                placeholder="Enter location"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
              />
            </div>
            <div className="flex justify-between gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  updateFormData({ location: manualLocation });
                  setLocationDialogOpen(false);
                }}
                disabled={!manualLocation.trim()}
              >
                Use Manual
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={detectLocation}
                type="button"
              >
                <Search className="h-4 w-4 mr-2" />
                Detect
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setLocationDialogOpen(false)}
              type="button"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MediaUploadStep({
  plans,
}: {
  plans: Plan[];
}) {
  const { formData, updateFormData } = usePostAdStore();
  const selectedTier =
    plans.find((tier) => tier.id === formData.paymentTier) || plans[0];

  const tierLimits = {
    free: { images: 2, videos: 0 },
    basic: { images: 4, videos: 0 },
    premium: { images: 10, videos: 2 },
    enterprise: { images: 10, videos: 2 },
  };

  const limits =
    tierLimits[selectedTier?.name.toLowerCase() as keyof typeof tierLimits] ||
    tierLimits.free;

  const imageUrls = (formData.mediaUrls || []).filter((url: string) => {
    return (
      url.startsWith("data:image/") ||
      (url.startsWith("blob:") && !url.includes("video"))
    );
  });

  const videoUrls = (formData.mediaUrls || []).filter((url: string) => {
    return url.startsWith("blob:") && url.includes("video");
  });

  const imageWarning = imageUrls.length > limits.images;
  const videoWarning = videoUrls.length > limits.videos;

  const handleFileChange = (urls: string[]) => {
    updateFormData({ mediaUrls: urls });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Media Upload</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Current Plan: {selectedTier?.name}</strong>
          <br />• Your plan allows: {limits.images} images
          {limits.videos > 0 ? ` and ${limits.videos} videos` : " (no videos)"}
          <br />• Only the allowed number will be published with your listing
          <br />• Images: JPEG, PNG, WebP (max 10MB each)
          <br />• Videos: MP4, WebM, MOV (max 50MB each, 30 seconds max)
        </p>
      </div>
      {(imageWarning || videoWarning) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Notice:</strong> You&apos;ve uploaded more media than your
            plan allows.
            {imageWarning &&
              ` Only the first ${limits.images} images will be published.`}
            {videoWarning &&
              ` Only the first ${limits.videos} videos will be published.`}
            <br />
            Consider upgrading your plan to publish all your media.
          </p>
        </div>
      )}
      <MediaBufferInput
        maxImages={limits.images}
        maxVideos={limits.videos}
        value={formData.mediaUrls || []}
        onChangeAction={handleFileChange}
      />
    </div>
  );
}

function PaymentTierStep({
  plans,
}: {
  plans: Plan[];
}) {
  const { formData, updateFormData } = usePostAdStore();
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Choose Your Plan</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((tier) => (
          <Card
            key={tier.id}
            className={`cursor-pointer transition-all ${
              formData.paymentTier === tier.id
                ? "ring-2 ring-blue-500"
                : "hover:shadow-md"
            }`}
            onClick={() => updateFormData({ paymentTier: tier.id })}
          >
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <div className="text-2xl font-bold text-blue-600 my-2">
                  Ksh {tier.price}
                  {tier.price > 0 && (
                    <span className="text-sm text-muted-foreground">
                      /month
                    </span>
                  )}
                </div>
                <ul className="text-sm space-y-1 text-left">
                  {(tier.features as string[]).map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full mt-4"
                  variant={
                    formData.paymentTier === tier.id ? "default" : "outline"
                  }
                >
                  {formData.paymentTier === tier.id
                    ? "Selected"
                    : "Choose Plan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PaymentMethodStep({
  plans,
  paymentStatus,
  pendingListingId,
  showRetryButton,
  showSupportDetails,
  onRetryPayment,
  isModalOpen,
  setIsModalOpen,
}: {
  plans: Plan[];
  paymentStatus: PaymentStatus;
  pendingListingId: string | null;
  showRetryButton: boolean;
  showSupportDetails: boolean;
  onRetryPayment: () => void;
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>; 
}) {
  const { formData, updateFormData, discountCodeInput, setDiscountCodeInput, appliedDiscount, setAppliedDiscount, discountMessage, setDiscountMessage } = usePostAdStore();
  const [showDiscountCodeSection, setShowDiscountCodeSection] = useState(false);
  const selectedTier =
    plans.find((tier) => tier.id === formData.paymentTier) || plans[0];

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
        setDiscountMessage(data.error || "Failed to apply discount.");
        toast({
          title: "Error",
          description: data.error || "Failed to apply discount.",
          variant: "destructive",
        });
        return;
      }

      setAppliedDiscount(data);
      if (data.type === "EXTRA_LISTING_DAYS") {
        setDiscountMessage(`Success! ${data.value} extra days will be added to your listing.`);
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
      setDiscountMessage("An unexpected error occurred.");
      toast({
        title: "Error",
        description: "An unexpected error occurred while applying discount.",
        variant: "destructive",
      });
    }
  };

  if (selectedTier.price === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Payment</h2>
        <div className="text-center py-8">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Your selected plan is free!</p>
          <p className="text-muted-foreground">No payment required.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Listing ID: {pendingListingId || "Pending..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Payment Method</h2>

      <Dialog open={isModalOpen} onOpenChange={(open) => {
          // Prevent dismiss while payment is pending to reduce confusion.
          if (paymentStatus !== "pending") setIsModalOpen(open);
        }}>
        <DialogContent className="w-[75%] mx-auto rounded-xl sm:max-w-[425px]">
          {paymentStatus === "pending" && (
            <>
              <DialogTitle className="text-center">Processing Payment</DialogTitle>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-12 w-12 text-orange-500 mb-4 animate-pulse" />
                <p className="text-muted-foreground text-center">
                  Please wait while we process your payment.
                  <br />
                  <span className="text-sm">Listing ID: {pendingListingId}</span>
                </p>
                {showRetryButton && (
                  <Button onClick={onRetryPayment} className="mt-4 text-sm py-1 px-2 bg-green-500 hover:bg-green-600 text-white transition-colors" >
                    I have paid
                  </Button>
                )}
                {showSupportDetails && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Payment still pending. Please contact support with Listing ID:{" "}
                    {pendingListingId}
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
                <p className="text-lg font-medium">Proceed to published listing now. Thank you.</p>
                <p className="text-muted-foreground text-center">
                  Your ad is now live!
                  <br />
                  <span className="text-sm">Listing ID: {pendingListingId}</span>
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
                  <span className="text-sm">Listing ID: {pendingListingId}</span>
                </p>
                <Button onClick={onRetryPayment} className="mt-4 text-sm py-1 px-2 bg-red-500 text-white" >
                  Pay again
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="bg-muted p-4 rounded-lg">
        <p className="font-medium">{selectedTier.name} Plan</p>
        <p className="text-2xl font-bold text-green-600">
          Ksh {selectedTier.price}
        </p>
        {appliedDiscount && appliedDiscount.type !== "EXTRA_LISTING_DAYS" && (
          <p className="text-lg font-bold text-blue-600">
            Discounted Price: Ksh {selectedTier.price - (appliedDiscount.type === "PERCENTAGE_DISCOUNT" ? (selectedTier.price * appliedDiscount.value / 100) : appliedDiscount.value)}
          </p>
        )}
        {discountMessage && (
          <p className="text-sm text-green-600 mt-1">{discountMessage}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          Listing ID: {pendingListingId || "Pending..."}
        </p>
      </div>

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
                  setDiscountMessage(null); // Clear message on input change
                  setAppliedDiscount(null); // Clear applied discount on input change
                }}
                disabled={!!appliedDiscount}
                className={discountMessage && !appliedDiscount ? "border-red-500 focus-visible:ring-red-500" : ""} // Added conditional class
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
      </div>
    </div>
  );
}

function PreviewStep({
  categories,
  plans,
  displayLocation,
}: {
  categories: any[];
  plans: Plan[];
  displayLocation: string;
}) {
  const { formData } = usePostAdStore();
  const selectedTier =
    plans.find((tier) => tier.id === formData.paymentTier) || plans[0];
  const selectedCategory = categories.find(
    (cat) => cat.name === formData.category,
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Preview Your Ad</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Next Step:</strong> After reviewing your ad, click
          &quot;Next&quot; will create a draft listing and take you to the
          payment step. Your listing will be saved but not published until
          payment is completed.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">
                {formData.title || "Ad Title"}
              </h3>
              <p className="text-2xl font-bold text-green-600">
                Ksh {formatPrice(Number(formData.price)) || "N/A"}
              </p>
              {formData.negotiable && (
                <span className="text-sm text-muted-foreground">
                  Negotiable
                </span>
              )}
            </div>
            {formData.mediaUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {formData.mediaUrls
                  .slice(0, 4)
                  .map((url: string, index: number) => (
                    <Image
                      key={index}
                      src={url || "/placeholder.svg"}
                      alt={`Preview ${index + 1}`}
                      width={128}
                      height={128}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ))}
              </div>
            )}
            <div>
              <p className="text-muted-foreground">
                {formData.description || "No description provided"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Category:</span>{" "}
                {selectedCategory?.name || "Not selected"}
              </div>
              <div>
                <span className="font-medium">Condition:</span>{" "}
                {formData.condition || "Not specified"}
              </div>
              <div>
                <span className="font-medium">Location:</span> {displayLocation}
              </div>
              <div>
                <span className="font-medium">Plan:</span> {selectedTier?.name}
              </div>
            </div>
            {formData.tags && formData.tags.length > 0 && (
              <div>
                <span className="font-medium text-sm">Tags:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="bg-muted px-2 py-1 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          By proceeding, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
