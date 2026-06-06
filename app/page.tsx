import { redirect } from "next/navigation";

// The root path has no screen of its own (PRD §5 defines exactly nine screens).
// Send everyone to /login; middleware redirects authenticated users to their
// role-appropriate landing from there.
export default function Home() {
  redirect("/login");
}
