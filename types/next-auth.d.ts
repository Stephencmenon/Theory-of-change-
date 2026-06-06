import type { AppRole } from "@/lib/roles";
import "next-auth";
import "next-auth/jwt";

// Session contract (ADD §6.3): the only source of identity truth at runtime.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      programId: string | null;
    };
  }

  interface User {
    id: string;
    role: AppRole;
    programId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    programId: string | null;
  }
}
