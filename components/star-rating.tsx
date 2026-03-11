import { Star } from "lucide-react";

interface StarRatingProps {
  /** The level to display (0-5) */
  level: number;
  /** Size of each star in pixels */
  size?: number;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Displays a 5-star rating visualization based on evidence strength level.
 * Filled stars represent the level (e.g., level 3 = 3 filled, 2 empty).
 */
export function StarRating({ level, size = 12, className = "" }: StarRatingProps) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={`transition-colors ${
            i < level ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}
