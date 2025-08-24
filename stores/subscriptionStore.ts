import { create } from 'zustand';

interface SubscriptionState {
  formData: {
    paymentMethod: string;
    phoneNumber: string;
    email: string;
  };
  discountCodeInput: string;
  appliedDiscount: { type: string; value: number; code_id: string } | null;
  discountMessage: string | null;
  updateFormData: (data: Partial<SubscriptionState['formData']>) => void;
  setDiscountCodeInput: (code: string) => void;
  setAppliedDiscount: (discount: { type: string; value: number; code_id: string } | null) => void;
  setDiscountMessage: (message: string | null) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  formData: {
    paymentMethod: 'mpesa',
    phoneNumber: '',
    email: '',
  },
  discountCodeInput: '',
  appliedDiscount: null,
  discountMessage: null,
  updateFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  setDiscountCodeInput: (code) => set({ discountCodeInput: code }),
  setAppliedDiscount: (discount) => set({ appliedDiscount: discount }),
  setDiscountMessage: (message) => set({ discountMessage: message }),
}));
