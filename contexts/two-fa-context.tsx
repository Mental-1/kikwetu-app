
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';

interface TwoFAContextType {
  qrCode: string | null;
  setQrCode: React.Dispatch<React.SetStateAction<string | null>>;
  clearTwoFAState: () => void;
}

const TwoFAContext = createContext<TwoFAContextType | undefined>(undefined);

export function TwoFAProvider({ children }: { children: ReactNode }) {
  const [qrCode, setQrCode] = useState<string | null>(null);

  const clearTwoFAState = useCallback(() => {
    setQrCode(null);
  }, []);

  useEffect(() => () => clearTwoFAState(), [clearTwoFAState]);

  const value = useMemo(
    () => ({ qrCode, setQrCode, clearTwoFAState }),
    [qrCode, clearTwoFAState]
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
