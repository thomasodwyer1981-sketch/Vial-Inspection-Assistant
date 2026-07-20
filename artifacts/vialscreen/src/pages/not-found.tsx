import { Link } from 'wouter';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-5">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-bold mb-2">Page Not Found</h1>
      <p className="text-sm text-muted-foreground mb-8">
        This page doesn't exist or may have been moved.
      </p>
      <Link
        href="/home"
        className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-sm active:scale-[0.98] transition-transform"
      >
        Back to Home
      </Link>
    </div>
  );
}
