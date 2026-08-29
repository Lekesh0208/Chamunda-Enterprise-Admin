"use client";

export default function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="no-print fixed top-4 right-4 bg-slate-900 text-white px-4 py-2 rounded shadow-lg z-50 text-sm max-w-sm">
      {message}
    </div>
  );
}
