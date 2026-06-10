"use client";

// Root error boundary (ADD §7.3). Catches errors thrown in the root layout
// itself, which the segment-level app/error.tsx cannot. Must render its own
// <html>/<body>. Production builds forward only a digest — no stack trace.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ maxWidth: "28rem", color: "#4b5563" }}>
            The application hit an unexpected error. This has been logged. Please
            try again, and contact an administrator if the problem continues.
          </p>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              borderRadius: "0.25rem",
              background: "#111827",
              color: "white",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
