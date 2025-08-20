import { create } from 'zustand';

type FormData = {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  price: string;
  negotiable: boolean;
  condition: string;
  location: string | number[];
  tags: string[];
  mediaUrls: string[];
  paymentTier: string;
  paymentMethod: string;
  phoneNumber: string;
  email: string;
};

type PostAdState = {
  formData: FormData;
  discountCodeInput: string;
  appliedDiscount: { type: 'PERCENTAGE_DISCOUNT' | 'FIXED_AMOUNT_DISCOUNT' | 'EXTRA_LISTING_DAYS'; value: number; code_id: string } | null;
  discountMessage: string | null;
  updateFormData: (data: Partial<FormData>) => void;
  setDiscountCodeInput: (value: string) => void;
  setAppliedDiscount: (value: { type: 'PERCENTAGE_DISCOUNT' | 'FIXED_AMOUNT_DISCOUNT' | 'EXTRA_LISTING_DAYS'; value: number; code_id: string } | null) => void;
  setDiscountMessage: (value: string | null) => void;
  resetForm: () => void;
};

const initialFormData: FormData = {
  title: '',
  description: '',
  category: '',
  subcategory: '',
  price: '',
  negotiable: false,
  condition: 'new',
  location: [],
  tags: [],
  mediaUrls: [],
  paymentTier: 'free',
  paymentMethod: '',
  phoneNumber: '',
  email: '',
};

export const usePostAdStore = create<PostAdState>((set) => ({
  formData: initialFormData,
  discountCodeInput: '',
  appliedDiscount: null,
  discountMessage: null,
  updateFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  setDiscountCodeInput: (value) => set({ discountCodeInput: value }),
  setAppliedDiscount: (value) => set({ appliedDiscount: value }),
  setDiscountMessage: (value) => set({ discountMessage: value }),
  resetForm: () => set({
    formData: initialFormData,
    discountCodeInput: '',
    appliedDiscount: null,
    discountMessage: null,
  }),
}));
