"use client";

import { useEffect, useState } from "react";
import { AppProvider } from "../src/components/AppProvider";

export function ClientProviders({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <AppProvider>{children}</AppProvider>;
}
