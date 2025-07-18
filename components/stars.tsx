import React from "react";
import { Star } from "lucide-react";

export function StarsComponent({ max }: { max: number }) {
  const stars = Array.from({ length: 5 }, (_, i) => i < max);

  return (
    <div className="flex items-center gap-0.5">
      {stars.map((filled, i) =>
        filled ? (
          <Star key={i} size={18} className="text-yellow-400 fill-yellow-400" />
        ) : (
          <Star key={i} size={18} className="text-gray-300" />
        )
      )}
    </div>
  );
}
