// Lightweight rotating star loader.
// Uses Tailwind's built-in animate-spin. No external styles needed.
import { Star } from "lucide-react";

export default function LoaderStar({
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
