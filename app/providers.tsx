"use client";

import "next-auth";
import { SessionProvider } from "next-auth/react";

declare module "next-auth" {
  interface Role {
    icon?: string;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}