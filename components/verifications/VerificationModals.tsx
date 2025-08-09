"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Clock } from 'lucide-react';
import { getSupabaseClient } from '@/utils/supabase/client';

export function EmailVerificationModal({
  showModal,
  setShowModal,
  userEmail,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  userEmail: string;
}) {
  const [email, setEmail] = useState(userEmail);
  const [isSending, setIsSending] = useState(false);

  const handleSendLink = async () => {
    setIsSending(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    setIsSending(false);
    setShowModal(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Verification Link Sent",
        description: `A verification link has been sent to ${email}. Please check your inbox. If you don't see it, check your spam folder.`,
      });
    }
  };

  return (
    <Dialog open={showModal} onOpenChange={(open) => {
      if (!open) {
        setEmail(userEmail); // Reset to original email on close
        setIsSending(false);
      }
      setShowModal(open);
    }}>
      <DialogContent className="w-[75%] mx-auto rounded-xl sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center">Verify Your Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email-verification">Email Address</Label>
            <Input
              id="email-verification"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendLink} disabled={isSending || !email || !/^\S+@\S+\.\S+$/.test(email)} className="mb-4">
            {isSending ? "Sending..." : "Send Verification Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IdentityVerificationModal({
  showModal,
  setShowModal,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}) {
  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="w-[75%] mx-auto rounded-xl sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center">Identity Verification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 text-center">
          <Clock className="h-16 w-16 text-gray-400 mx-auto" />
          <p className="text-muted-foreground">Coming Soon</p>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PhoneVerificationModal({
  showModal,
  setShowModal,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}) {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const hasPlus = v.startsWith("+");
    const digitsOnly = v.replace(/[^\d]/g, "");
    setPhoneNumber(hasPlus ? `+${digitsOnly}` : digitsOnly);
  };

  const handleSendCode = async () => {
    setIsSending(true);
    // Simulate sending a verification code
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSending(false);
    setStep(2);
    toast({
      title: "Code Sent",
      description: `A verification code has been sent to ${phoneNumber}.`,
    });
  };

  const handleVerifyCode = async () => {
    setIsVerifying(true);
    // Simulate verifying the code
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsVerifying(false);
    setShowModal(false);
    toast({
      title: "Phone Number Verified",
      description: "Your phone number has been successfully verified.",
    });
  };

  return (
    <Dialog open={showModal} onOpenChange={(open) => {
      if (isSending || isVerifying) return;
      if (!open) {
        setStep(1);
        setPhoneNumber("");
        setCode("");
        setIsSending(false);
        setIsVerifying(false);
      }
      setShowModal(open);
    }}>
      <DialogContent className="w-[75%] mx-auto rounded-xl sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center">
            {step === 1 ? "Verify Your Phone Number" : "Enter Verification Code"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {step === 1 ? (
            <div className="space-y-2">
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                placeholder="Enter your phone number"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="verification-code">6-Digit Code</Label>
              <Input
                id="verification-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ""))}
                maxLength={6}
                placeholder="Enter the 6-digit code"
              />
            </div>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          {step === 1 ? (
            <Button onClick={handleSendCode} disabled={isSending || phoneNumber.length < 10} className="mb-4">
              {isSending ? "Sending..." : "Send Code"}
            </Button>
          ) : (
            <Button
              onClick={handleVerifyCode}
              disabled={isVerifying || code.length !== 6}
              className="mb-4"
            >
              {isVerifying ? "Verifying..." : "Verify"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}