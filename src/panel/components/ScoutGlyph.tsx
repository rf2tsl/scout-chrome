// Inline SVG reticle. Mirrors the canonical geometry in
// public/icons/scout-icon.svg so the in-popup glyph matches the toolbar mark.

interface Props {
  size?: number;
  withTile?: boolean; // include the dark squircle tile behind the reticle
  color?: string;     // overrides the accent color (e.g. for "on light" variants)
  opacityScale?: number; // multiply ring opacities (1.0 default)
}

export function ScoutGlyph({
  size = 22,
  withTile = false,
  color = "#00d4aa",
  opacityScale = 1,
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {withTile && <rect width="128" height="128" rx="28" fill="#0d1117" />}
      <circle
        cx="64"
        cy="64"
        r="42"
        stroke={color}
        strokeWidth="3"
        fill="none"
        opacity={0.28 * opacityScale}
      />
      <circle
        cx="64"
        cy="64"
        r="28"
        stroke={color}
        strokeWidth="5"
        fill="none"
        opacity={0.75 * opacityScale}
      />
      <circle cx="64" cy="64" r="9" fill={color} />
      <line x1="64" y1="14" x2="64" y2="22" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <line x1="64" y1="106" x2="64" y2="114" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <line x1="14" y1="64" x2="22" y2="64" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <line x1="106" y1="64" x2="114" y2="64" stroke={color} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
