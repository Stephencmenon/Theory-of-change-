import LoginForm from "./LoginForm";

// Screen 1 — /login (PRD §5). Public. Middleware redirects already-authenticated
// users to their role landing before this renders.
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Impact Dashboard</h1>
        <p className="mb-6 text-sm text-gray-500">Sign in to continue.</p>
        <LoginForm />
      </div>
    </main>
  );
}
