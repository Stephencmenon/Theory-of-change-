"use client";

// Route-segment error boundary (ADD §7.3). Caught render/runtime errors in any
// page render a friendly message with a recovery action — never a stack trace.
// In production Next.js strips the error message/stack from this client boundary
// (only a digest is forwarded), so nothing sensitive is exposed to the browser.
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to server logs only; the digest correlates with the server-side
    // entry. No user-facing stack trace.
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        event: "unhandled_error",
        digest: error.digest ?? null,
      }),
    );
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
      <p className="max-w-md text-gray-600">
        The page couldn&apos;t be displayed. This has been logged. Please try
        again, and contact an administrator if the problem continues.
      </p>
      {error.digest ? (
        <p className="text-xs text-gray-400">Reference: {error.digest}</p>
      ) : null}
      <button
        onClick={reset}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        Try again
      </button>
    </main>
  );
}
