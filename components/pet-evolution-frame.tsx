"use client";

import { cn } from "@/lib/utils";

interface PetEvolutionFrameProps {
  emoji: string;
  evolutionStage: number; // 0=baby, 1=teen, 2=adult
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { frame: "h-24 w-24", emoji: "text-4xl", badge: "text-[10px] px-2 py-0.5" },
  md: { frame: "h-36 w-36", emoji: "text-7xl", badge: "text-xs px-3 py-1" },
  lg: { frame: "h-44 w-44", emoji: "text-8xl", badge: "text-sm px-4 py-1.5" },
};

export function PetEvolutionFrame({
  emoji,
  evolutionStage,
  size = "md",
  className,
}: PetEvolutionFrameProps) {
  const s = sizeMap[size];

  // Baby stage: simple clean circle
  if (evolutionStage === 0) {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        <div
          className={cn(
            "flex items-center justify-center rounded-full",
            "bg-gradient-to-br from-amber-50 to-orange-50",
            "border-2 border-amber-100",
            "shadow-md",
            s.frame
          )}
        >
          <span className={s.emoji}>{emoji}</span>
        </div>
      </div>
    );
  }

  // Teen stage: gradient halo + sparkle particles
  if (evolutionStage === 1) {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        {/* Outer glow ring */}
        <div
          className={cn(
            "absolute rounded-full",
            "bg-gradient-to-r from-mint-green/30 via-sky-400/20 to-dream-purple/30",
            "animate-pulse",
            "h-[calc(100%+24px)] w-[calc(100%+24px)]"
          )}
        />
        {/* Sparkle particles */}
        <div className="absolute inset-0 animate-spin-slow">
          <span className="absolute left-1/2 -top-1 text-sm">✨</span>
          <span className="absolute right-0 top-1/2 text-xs">⭐</span>
          <span className="absolute bottom-0 left-0 text-xs">💫</span>
        </div>
        {/* Main frame */}
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full",
            "bg-gradient-to-br from-sky-50 via-mint-green/10 to-dream-purple/10",
            "border-2 border-mint-green/40",
            "shadow-lg shadow-mint-green/20",
            s.frame
          )}
        >
          <span className={s.emoji}>{emoji}</span>
        </div>
      </div>
    );
  }

  // Adult stage: golden ornate frame + crown + aura
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer aura glow */}
      <div
        className={cn(
          "absolute rounded-full",
          "bg-gradient-to-r from-amber-300/40 via-yellow-200/30 to-amber-300/40",
          "blur-sm",
          "h-[calc(100%+32px)] w-[calc(100%+32px)]"
        )}
      />
      {/* Rotating golden ring */}
      <div
        className={cn(
          "absolute rounded-full",
          "border-2 border-dashed border-amber-400/60",
          "animate-spin-slow",
          "h-[calc(100%+16px)] w-[calc(100%+16px)]"
        )}
      />
      {/* Crown on top */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl drop-shadow-md">
        👑
      </div>
      {/* Wing decorations */}
      <div className="absolute left-[-18px] top-1/2 -translate-y-1/2 text-xl opacity-70">
        ✦
      </div>
      <div className="absolute right-[-18px] top-1/2 -translate-y-1/2 text-xl opacity-70">
        ✦
      </div>
      {/* Sparkle orbit */}
      <div className="absolute inset-0 animate-spin-slow">
        <span className="absolute left-1/2 -top-2 text-sm">🌟</span>
        <span className="absolute right-[-4px] top-1/2 text-sm">✨</span>
        <span className="absolute bottom-[-4px] left-1/4 text-xs">💎</span>
        <span className="absolute left-[-4px] top-1/4 text-xs">⭐</span>
      </div>
      {/* Main golden frame */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full",
          "bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100",
          "border-[3px] border-amber-400",
          "shadow-xl shadow-amber-300/30",
          s.frame
        )}
      >
        <span className={s.emoji}>{emoji}</span>
      </div>
    </div>
  );
}
