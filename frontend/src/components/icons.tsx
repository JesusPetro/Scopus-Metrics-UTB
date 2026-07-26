type IconProps = { className?: string };

const base = "none";

export function IconGrid({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={base} stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
    </svg>
  );
}

export function IconRanking({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={base} stroke="currentColor" strokeWidth="1.8">
      <path d="M6 20V13" strokeLinecap="round" />
      <path d="M12 20V8" strokeLinecap="round" />
      <path d="M18 20V4" strokeLinecap="round" />
    </svg>
  );
}

export function IconNetwork({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={base} stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="6" r="2.4" />
      <circle cx="5.5" cy="18" r="2.4" />
      <circle cx="18.5" cy="18" r="2.4" />
      <path d="M10.3 7.8 7.2 15.8M13.7 7.8l3.1 8M7.9 18h8.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconDocument({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={base} stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M14 3.5V8h4" strokeLinejoin="round" />
      <path d="M8 12.5h8M8 16h8M8 9h3" strokeLinecap="round" />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={base} stroke="currentColor" strokeWidth="1.8">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.5-4.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconExport({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={base} stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3.5v11" strokeLinecap="round" />
      <path d="m7.5 10 4.5 4.5L16.5 10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 16.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconArrowUp({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={base} stroke="currentColor" strokeWidth="2">
      <path d="M12 19V6M6.5 11.5 12 6l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconVerified({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}

export function IconInfo({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={base} stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.2" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconExternalLink({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={base} stroke="currentColor" strokeWidth="1.8">
      <path d="M9.5 14.5 20 4" strokeLinecap="round" />
      <path d="M13.5 4H20v6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 13.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5h5.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconZoomIn({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={base} stroke="currentColor" strokeWidth="1.8">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M10.5 7.8v5.4M7.8 10.5h5.4" strokeLinecap="round" />
      <path d="m20 20-4.5-4.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconZoomOut({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={base} stroke="currentColor" strokeWidth="1.8">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M7.8 10.5h5.4" strokeLinecap="round" />
      <path d="m20 20-4.5-4.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconMaximize({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={base} stroke="currentColor" strokeWidth="1.8">
      <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={base} stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15 13.6c2.7.4 5 2.3 5 5.4" strokeLinecap="round" />
    </svg>
  );
}
