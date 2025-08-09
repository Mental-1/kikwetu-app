
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TwoFAContextType {
  qrCode: string | null;
  secret: string | null;
  setQrCode: (qrCode: string | null) => void;
  setSecret: (secret: string | null) => void;
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

  return (
    <TwoFAContext.Provider value={{ qrCode, secret, setQrCode, setSecret, clearTwoFAState }}>
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
