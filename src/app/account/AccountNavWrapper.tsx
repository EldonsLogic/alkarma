"use client";

import { AccountNav } from "./AccountNav";
import { signOut } from "next-auth/react";

export function AccountNavWrapper() {
  return (
    <AccountNav
      onSignOut={() => signOut({ callbackUrl: "/" })}
    />
  );
}
