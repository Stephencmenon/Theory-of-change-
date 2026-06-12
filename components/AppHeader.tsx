import Link from "next/link";
import { getSession } from "@/lib/session";
import SignOutButton from "@/components/SignOutButton";
import type { AppRole } from "@/lib/roles";

const NAV: Record<AppRole, { href: string; label: string }[]> = {
  ed: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/funders", label: "Funders" },
    { href: "/report", label: "Reports" },
  ],
  fundraising: [
    { href: "/funders", label: "Funders" },
    { href: "/revenue", label: "Revenue" },
    { href: "/report", label: "Reports" },
  ],
  admin: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/funders", label: "Funders" },
    { href: "/admin", label: "Admin" },
  ],
  staff: [],
};

// Shared app chrome for ED / fundraising screens. Renders role-appropriate nav.
export default async function AppHeader({ active }: { active?: string }) {
  const session = await getSession();
  const role = session?.user.role;
  const links = role ? NAV[role] : [];

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <nav className="flex items-center gap-6">
          <span className="font-semibold text-gray-900">Impact Dashboard</span>
          <div className="flex gap-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  active === l.href
                    ? "text-sm font-medium text-gray-900"
                    : "text-sm text-gray-600 hover:text-gray-900"
                }
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
        <SignOutButton />
      </div>
    </header>
  );
}
