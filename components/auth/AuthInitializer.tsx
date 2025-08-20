"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export function AuthInitializer() {
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  return null;
}