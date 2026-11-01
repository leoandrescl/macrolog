import { cn } from "@/lib/cn";
import { PROFILE_COLORS } from "@/lib/constants";
import { normalizeText } from "@/lib/normalize";
import type { Profile } from "@/types/domain";

export function initialsFor(name: string): string {
  const clean = name.trim();
  if (!clean) return "?";

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return normalizeText(words[0]).slice(0, 2).toUpperCase();
  }

  return `${normalizeText(words[0])[0] ?? ""}${normalizeText(words[1])[0] ?? ""}`.toUpperCase();
}

export function Avatar({
  profile,
  size = "md",
  className,
}: {
  profile: Profile;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const color =
    PROFILE_COLORS.find((item) => item.id === profile.color)?.hex ??
    PROFILE_COLORS[0].hex;

  const sizes = {
    sm: "size-8 text-[11px]",
    md: "size-10 text-xs",
    lg: "size-12 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-[#10160a]",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initialsFor(profile.name)}
    </span>
  );
}
