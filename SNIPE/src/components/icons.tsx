import { useId, type ReactNode, type SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = ({ size = 18, ...rest }: P, children: ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const Reticle = (p: P) =>
  base(p, (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ));

export const Target = (p: P) =>
  base(p, (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ));

export const ChartIcon = (p: P) =>
  base(p, (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
    </>
  ));

export const UserIcon = (p: P) =>
  base(p, (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </>
  ));

export const UploadIcon = (p: P) =>
  base(p, (
    <>
      <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4 16v3a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3" />
    </>
  ));

export const CheckIcon = (p: P) => base(p, <path d="M4.5 12.5l5 5L19.5 7" />);

export const XIcon = (p: P) => base(p, <path d="M6 6l12 12M18 6L6 18" />);

export const ClockIcon = (p: P) =>
  base(p, (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ));

export const CopyIcon = (p: P) =>
  base(p, (
    <>
      <rect x="8" y="8" width="12" height="12" rx="1.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </>
  ));

export const DownloadIcon = (p: P) =>
  base(p, (
    <>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 17v2a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-2" />
    </>
  ));

export const TrashIcon = (p: P) =>
  base(p, (
    <>
      <path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
      <path d="M6.5 7l1 12.2A1.5 1.5 0 0 0 9 20.5h6a1.5 1.5 0 0 0 1.5-1.3l1-12.2" />
      <path d="M10 11v5.5M14 11v5.5" />
    </>
  ));

export const ResetIcon = (p: P) =>
  base(p, (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 1 2.2 5.3" />
      <path d="M4.5 20v-4.5H9" />
    </>
  ));

export const LockIcon = (p: P) =>
  base(p, (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ));

export const EyeIcon = (p: P) =>
  base(p, (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ));

export const EyeOffIcon = (p: P) =>
  base(p, (
    <>
      <path d="M4 4l16 16" />
      <path d="M10.6 6c.45-.08.92-.13 1.4-.13 6 0 9.5 6.13 9.5 6.13a17 17 0 0 1-2.7 3.4M6.4 6.9A16.7 16.7 0 0 0 2.5 12S6 18.13 12 18.13c1.2 0 2.3-.24 3.3-.63" />
    </>
  ));

export const PhoneIcon = (p: P) =>
  base(p, (
    <path d="M5.5 4h3l1.5 4-2 1.5a12.5 12.5 0 0 0 6.5 6.5L16 14l4 1.5v3a1.5 1.5 0 0 1-1.6 1.5C10.6 19.6 4.4 13.4 4 5.6A1.5 1.5 0 0 1 5.5 4z" />
  ));

export const BellIcon = (p: P) =>
  base(p, (
    <>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13.5 6 9.5z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </>
  ));

export const PowerIcon = (p: P) =>
  base(p, (
    <>
      <path d="M12 3v8" />
      <path d="M7 6.5a7.5 7.5 0 1 0 10 0" />
    </>
  ));

export const ShieldIcon = (p: P) =>
  base(p, (
    <>
      <path d="M12 3l7.5 2.8v5.4c0 4.6-3.1 8-7.5 9.8-4.4-1.8-7.5-5.2-7.5-9.8V5.8z" />
      <path d="M9 12l2 2 4-4.5" />
    </>
  ));

export const WalletIcon = (p: P) =>
  base(p, (
    <>
      <rect x="3.5" y="6" width="17" height="13" rx="1.5" />
      <path d="M3.5 9.5h17" />
      <path d="M16 14.5h1.5" />
    </>
  ));

export const LogoutIcon = (p: P) =>
  base(p, (
    <>
      <path d="M9 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h3" />
      <path d="M15 8l4 4-4 4M19 12H9.5" />
    </>
  ));

export const LayersIcon = (p: P) =>
  base(p, (
    <>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ));

export const InfoIcon = (p: P) =>
  base(p, (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 7.5v.5" />
    </>
  ));

export const CameraIcon = (p: P) =>
  base(p, (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 5h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ));

export const BoltIcon = (p: P) =>
  base(p, <path d="M13 2.5L5 13.5h5.5L10 21.5l8.5-11.5H13l1.5-7.5z" />);

export const ScanIcon = (p: P) =>
  base(p, (
    <>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="M4 12h16" strokeDasharray="2.5 2" />
      <circle cx="9.5" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="15" r="1" fill="currentColor" stroke="none" />
    </>
  ));

export const ArrowRight = (p: P) => base(p, <path d="M4 12h15m-5.5-5.5L19 12l-5.5 5.5" />);

export const ChevronDown = (p: P) => base(p, <path d="M5.5 9l6.5 6.5L18.5 9" />);

export const CrownIcon = (p: P) =>
  base(p, (
    <>
      <path d="M4 17l-1.2-9 5 3.6L12 5l4.2 6.6 5-3.6L20 17z" />
      <path d="M5 20h14" />
    </>
  ));

export const SunIcon = (p: P) =>
  base(p, (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" />
    </>
  ));

export const MoonIcon = (p: P) =>
  base(p, <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />);

/* ------------------------------------------------------------------ */
/* Aviator — avion + largage de billets (repère centré)                */
/* ------------------------------------------------------------------ */

const PLANE_PATH =
  "M22.8 12c-2.1 1.1-5.1 1.7-8.3 1.7h-.9l-2.4 4.7-1.2-.5 1.5-4.3-3.7-.6-1.6 1.9-.9-.7 1.2-2-1.2-2 .9-.7 1.6 1.9 3.7-.6-1.5-4.3 1.2-.5 2.4 4.7h.9c3.2 0 6.2.6 8.3 1.7z";

function NoteGlyph({ fill, ink }: { fill: string; ink: string }) {
  return (
    <g>
      <rect x="-5" y="-3.1" width="10" height="6.2" rx="0.9" fill={fill} stroke={ink} strokeWidth="0.55" />
      <circle cx="0" cy="0" r="1.55" fill="none" stroke={ink} strokeWidth="0.55" />
      <path d="M-3.3 -1.35h1.4M1.9 1.35h1.4" stroke={ink} strokeWidth="0.5" strokeLinecap="round" />
    </g>
  );
}

export function PlaneShower({
  cx = 0,
  cy = 0,
  r = 38,
  scale = 1,
  plane = "#c9ac5b",
  note = "#9c7b25",
  ink = "rgba(22,21,17,0.42)",
}: {
  cx?: number;
  cy?: number;
  r?: number;
  scale?: number;
  plane?: string;
  note?: string;
  ink?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <>
      <clipPath id={`av${id}`}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <g clipPath={`url(#av${id})`}>
        <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
          <g transform="translate(-24 -4)">
            <g className="av-note" style={{ animationDelay: "2.2s" }}>
              <NoteGlyph fill={note} ink={ink} />
            </g>
          </g>
          <g transform="translate(-3 -2)">
            <g className="av-note" style={{ animationDelay: "3.5s" }}>
              <NoteGlyph fill={note} ink={ink} />
            </g>
          </g>
          <g transform="translate(19 -5)">
            <g className="av-note" style={{ animationDelay: "4.8s" }}>
              <NoteGlyph fill={note} ink={ink} />
            </g>
          </g>
          <g className="av-plane">
            <g transform="translate(-13 -12.5) scale(1.05)">
              <path d={PLANE_PATH} fill={plane} />
              <path d="M23.5 9.6v4.8" stroke={ink} strokeWidth="1.1" strokeLinecap="round" />
            </g>
          </g>
        </g>
      </g>
    </>
  );
}

export const PlaneIcon = (p: P) =>
  base(p, (
    <>
      <path d={PLANE_PATH} fill="currentColor" stroke="none" />
      <path d="M23.5 9.6v4.8" />
    </>
  ));

/* ------------------------------------------------------------------ */
/* Logo Snipe — réticule de visée                                      */
/* ------------------------------------------------------------------ */

export function Logo({ size = 34, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="16" stroke="#9c7b25" strokeWidth="2.2" />
        <path d="M24 2v10M24 36v10M2 24h10M36 24h10" stroke="#161511" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="24" cy="24" r="3" fill="#9c7b25" />
        <circle cx="24" cy="24" r="21.5" stroke="#161511" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 5" />
      </svg>
      {withWordmark && (
        <span className="leading-none">
          <span className="block font-display font-semibold tracking-tight text-[1.35em]" style={{ fontSize: size * 0.62 }}>
            Snipe
          </span>
          <span className="block font-mono uppercase tracking-[0.32em] text-ink-faint" style={{ fontSize: size * 0.24 }}>
            analyse prédictive
          </span>
        </span>
      )}
    </span>
  );
}
