import Link from 'next/link';
import { NotFoundSearchParams } from '@/components/not-found-search-params';
import { Suspense } from 'react';

/**
 * Custom 404 Not Found page for Next.js App Router.
 * This is a server component.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <h1 className="text-7xl md:text-9xl font-extrabold text-destructive mb-4">404</h1>
      <h2 className="text-3xl md:text-4xl font-semibold mb-6 text-center">Page Not Found</h2>

      <Suspense fallback={<p className="text-lg text-muted-foreground mb-8">The requested resource could not be found.</p>}>
        <NotFoundSearchParams />
      </Suspense>

      <Link
        href="/"
        className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-lg shadow-md hover:bg-primary/90 transition-colors duration-200 text-lg font-medium"
      >
        Go back home
      </Link>
    </div>
  );
}
