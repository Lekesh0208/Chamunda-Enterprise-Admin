"use client";

// Catches errors in the root layout itself - the last line of defense.
// Next.js requires global-error.tsx to render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 40, background: "#fef2f2" }}>
        <div style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#7f1d1d", fontSize: 14, marginBottom: 16 }}>
            The application hit an unexpected error. Nothing was lost — your data is safely stored
            in the database, not in this page.
          </p>
          <pre
            style={{
              background: "#fff",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              textAlign: "left",
              overflow: "auto",
              color: "#450a0a",
            }}
          >
            {error.message}
            {error.digest ? `\n\nError ID: ${error.digest}` : ""}
          </pre>
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "8px 16px",
              background: "#991b1b",
              color: "white",
              borderRadius: 6,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
