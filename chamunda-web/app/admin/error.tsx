"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

// This catches any error thrown while rendering, or in an effect, anywhere
// under /admin - a broken page shows this instead of a blank white screen.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin section error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertTriangle className="mx-auto text-red-600 mb-3" size={36} />
        <h2 className="text-lg font-bold text-red-800 mb-2">This page hit an error</h2>
        <p className="text-sm text-red-700 mb-4">
          Something went wrong loading this screen. Your saved data is not affected — this only
          affects the current page.
        </p>
        <pre className="text-left text-xs bg-white border border-red-200 rounded p-3 mb-4 overflow-auto text-red-900">
          {error.message || "Unknown error"}
          {error.digest ? `\nError ID: ${error.digest}` : ""}
        </pre>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded font-medium hover:bg-red-800"
        >
          <RotateCcw size={15} /> Try again
        </button>
      </div>
    </div>
  );
}
