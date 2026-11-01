import { cn } from "@/lib/cn";

export function LogoMark({
  size = 34,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0", className)}
    >
      <rect width="48" height="48" rx="13" fill="#080B0F" />
      <circle cx="24" cy="24" r="13" stroke="#1B2531" strokeWidth="3.4" />
      <path
        d="M24 11A13 13 0 0 1 35.3 17.5"
        stroke="#B6F36B"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M36.6 26A13 13 0 0 1 29.9 36.5"
        stroke="#FCD34D"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M17.6 36.2A13 13 0 0 1 11.1 22.7"
        stroke="#FDA4AF"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="3.2" fill="#B6F36B" />
    </svg>
  );
}

export function Logo({
  showText = true,
  size = 34,
  className,
}: {
  showText?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showText ? (
        <span className="text-[17px] font-bold tracking-[-0.03em] text-fg">
          Macro<span className="text-accent">Log</span>
        </span>
      ) : null}
    </div>
  );
}
