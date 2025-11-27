// frontend/src/_components/ui/loading-spinner.tsx
// Replaces the old "Kinber is thinking..." text with a minimal rotating star loader

import { Star } from "lucide-react";

export default function LoadingSpinner({
  size = 18,
  title = "Thinking…",
  className = "",
}: { size?: number; title?: string; className?: string }) {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
      className={`flex items-center justify-center ${className}`}
    >
      <Star className="animate-spin" width={size} height={size} />
    </div>
  );
}
