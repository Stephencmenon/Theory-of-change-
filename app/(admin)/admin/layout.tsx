import Link from "next/link";
import { requireRole } from "@/lib/session";
import SignOutButton from "@/components/SignOutButton";

const SECTIONS = [
  { slug: "programs", label: "Programs" },
  { slug: "metrics", label: "Metrics" },
  { slug: "users", label: "Users" },
  { slug: "targets", label: "Targets" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["admin"]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold text-gray-900">
              Admin
            </Link>
            <nav className="flex gap-4">
              {SECTIONS.map((s) => (
                <Link
                  key={s.slug}
                  href={`/admin/${s.slug}`}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
