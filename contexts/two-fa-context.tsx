
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';

interface TwoFAContextType {
  qrCode: string | null;
  secret: string | null;
  setQrCode: React.Dispatch<React.SetStateAction<string | null>>;
  setSecret: React.Dispatch<React.SetStateAction<string | null>>;
  clearTwoFAState: () => void;
}

const TwoFAContext = createContext<TwoFAContextType | undefined>(undefined);

export function TwoFAProvider({ children }: { children: ReactNode }) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const clearTwoFAState = () => {
    setQrCode(null);
    setSecret(null);
  };

  useEffect(() => {
    if (!secret) return;
    const timer = window.setTimeout(() => {
      // Only clear the secret; keep QR if you still want to show it.
      setSecret(null);
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearTimeout(timer);
  }, [secret]);

  useEffect(() => () => clearTwoFAState(), []);

  const value = useMemo(
    () => ({ qrCode, secret, setQrCode, setSecret, clearTwoFAState }),
    [qrCode, secret]
  );

    return (
    <TwoFAContext.Provider value={value}>
      {children}
    </TwoFAContext.Provider>
  );
}

export function useTwoFA() {
  const context = useContext(TwoFAContext);
  if (context === undefined) {
    throw new Error('useTwoFA must be used within a TwoFAProvider');
  }
  return context;
}
