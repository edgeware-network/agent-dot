"use client";

import Link from "next/link";

// Force dynamic rendering to prevent static generation issues
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="text-muted-foreground mb-6">Page not found</p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-block rounded-md px-4 py-2"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
